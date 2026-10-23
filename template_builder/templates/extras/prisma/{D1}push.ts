import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { highlightANSI } from '@speed-highlight/core';
import theme from '@speed-highlight/core/themes/atom-dark.js';

loadEnvFile();

const is_local = process.argv.includes('--local');
const local_flag = is_local ? '--local' : '--remote';

let database_name: string;

if (is_local) {
	database_name = 'DB';
} else {
	if (!process.env.DATABASE_NAME) {
		console.error('DATABASE_NAME not set (must be the name of a D1 database)');
		process.exit(1);
	}
	database_name = process.env.DATABASE_NAME;
}
const dirname = resolve(fileURLToPath(import.meta.url), '..');

const temp_config = resolve(dirname, '.temp-prisma-config.mjs');
const temp_db = resolve(dirname, '.temp.db');
const migration_file = resolve(dirname, '.temp.sql');
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
const current_res: { error: unknown } | [{ results: Array<{ sql: string }> }] = JSON.parse(
	spawnSync(
		npm_bin('wrangler'),
		[
			'd1',
			'execute',
			database_name,
			local_flag,
			'--command',
			"SELECT * FROM sqlite_schema WHERE name != '_cf_KV' AND name != 'sqlite_sequence'",
			'--json',
		],
		{ encoding: 'utf-8' },
	).stdout,
);
if ('error' in current_res) {
	console.error(current_res.error);
	console.error('Have you put your database ID in wrangler.toml?');
	process.exit(1);
}
const current = current_res[0].results;

// 2. create dummy db with that schema
const db = new DatabaseSync(temp_db);
for (const item of current) {
	if (item.sql && item.sql !== 'null') {
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

const migration_sql = migration.stdout
	.replace(/^PRAGMA foreign_keys=OFF;/gm, 'PRAGMA defer_foreign_keys=true;')
	.replace(/^PRAGMA foreign_keys=ON;/gm, 'PRAGMA defer_foreign_keys=false;')
	.replace(/^PRAGMA foreign_key_check;/gm, '');
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
writeFileSync(migration_file, migration_sql);
let res;
try {
	res = spawnSync(
		npm_bin('wrangler'),
		['d1', 'execute', database_name, local_flag, '--file', migration_file],
		{ stdio: 'inherit' },
	);
} finally {
	unlinkSync(migration_file);
}

if (res.status !== 0) {
	console.error('Migration failed');
	process.exit(res.status);
}

spawnSync(npm_bin('prisma'), ['generate'], { stdio: 'inherit' });
