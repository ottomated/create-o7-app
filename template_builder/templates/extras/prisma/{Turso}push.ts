import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { highlightANSI } from '@speed-highlight/core';
import theme from '@speed-highlight/core/themes/atom-dark.js';

loadEnvFile();

if (!process.env.TURSO_URL) {
	throw new Error('TURSO_URL not set');
}

const client = createClient({
	url: process.env.TURSO_URL,
	authToken: process.env.TURSO_TOKEN,
});

const dirname = resolve(fileURLToPath(import.meta.url), '..');

const temp_config = resolve(dirname, '.temp-prisma-config.mjs');
const temp_db = resolve(dirname, '.temp.db');
const schema = resolve(dirname, 'schema.prisma');
function remove_temps() {
	try {
		unlinkSync(temp_db);
	} catch {
		/* ignore */
	}
	try {
		unlinkSync(temp_config);
	} catch {
		/* ignore */
	}
}
remove_temps();

function npm_bin(command: string) {
	return resolve(dirname, '../node_modules/.bin', command);
}
// 1. Pull current schema
const current = await client.execute("SELECT * FROM sqlite_schema WHERE name != 'sqlite_sequence'");

// 2. create dummy db with that schema
const db = new DatabaseSync(temp_db);
for (const item of current.rows) {
	if (typeof item.sql === 'string' && item.sql !== 'null') {
		db.exec(item.sql);
	}
}
db.close();

// 3. generate migration on dummy db
writeFileSync(
	temp_config,
	`export default {datasource:{url:${JSON.stringify(pathToFileURL(temp_db))}}}`,
);
let migration: SpawnSyncReturns<string>;
try {
	migration = spawnSync(
		npm_bin('prisma'),
		[
			'migrate',
			'diff',
			'--config',
			temp_config,
			'--from-config-datasource',
			'--to-schema',
			schema,
			'--script',
		],
		{ encoding: 'utf-8' },
	);
} finally {
	remove_temps();
}
if (migration.status !== 0) {
	console.error('Prisma error:');
	console.error(migration.stderr);
	process.exit(0);
}

const migration_sql = migration.stdout;
console.log();
console.log(await highlightANSI(migration_sql, 'sql', theme));

if (migration.stdout.includes('-- This is an empty migration.')) {
	console.log('No changes');
	process.exit(0);
}

const rl = createInterface(process.stdin, process.stdout);

let execute: string;
try {
	execute = await rl.question('Execute migration? [y/N] ');
} catch {
	execute = '';
} finally {
	rl.close();
}
if (execute.trim().toLowerCase() !== 'y') process.exit(0);

// 4. apply migration on actual db
try {
	await client.executeMultiple(migration_sql);
} catch (e) {
	console.error('Migration failed', e);
	process.exit(1);
}

spawnSync(npm_bin('prisma'), ['generate'], { stdio: 'inherit' });
