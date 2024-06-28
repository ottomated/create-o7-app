import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import 'dotenv/config';

if (!process.env.TURSO_URL) {
	throw new Error('TURSO_URL not set');
}

const client = createClient({
	url: process.env.TURSO_URL,
	authToken: process.env.TURSO_TOKEN,
});

const dirname = resolve(fileURLToPath(import.meta.url), '..');

const tempDb = resolve(dirname, './temp.db');
try {
	unlinkSync(tempDb);
} catch (_) {
	/* ignore */
}
const schema = resolve(dirname, './schema.prisma');

// 1. Pull current schema
const current = await client.execute(
	"SELECT * FROM sqlite_schema WHERE name != 'sqlite_sequence'",
);

// 2. create dummy db with that schema
const db = new Database(tempDb);
for (const item of current.rows) {
	if (item.sql && item.sql !== 'null') {
		db.prepare(item.sql).run();
	}
}

// 3. generate migration on dummy db
const migration = spawnSync(
	'npx',
	[
		'prisma',
		'migrate',
		'diff',
		'--from-url',
		`file:${tempDb}`,
		'--to-schema-datamodel',
		schema,
		'--script',
	],
	{ encoding: 'utf-8' },
);
if (migration.status !== 0) {
	console.error('Prisma error:');
	console.error(migration.stderr);
	unlinkSync(tempDb);
	process.exit(0);
}
if (migration.stdout.includes('-- This is an empty migration.')) {
	console.log('No changes');
	unlinkSync(tempDb);
	process.exit(0);
}

const migrationSql = migration.stdout;

console.log(migrationSql);

// 4. apply migration on actual db
try {
	await client.executeMultiple(migrationSql);
} catch (e) {
	console.error('Migration failed', e);
	process.exit(1);
}

unlinkSync(tempDb);

spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
