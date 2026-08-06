import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

loadEnvFile();

if (!process.env.TURSO_URL) {
	throw new Error('TURSO_URL not set');
}

const client = createClient({
	url: process.env.TURSO_URL,
	authToken: process.env.TURSO_TOKEN,
});

const dirname = resolve(fileURLToPath(import.meta.url), '..');

const temp_db = resolve(dirname, './temp.db');
const schema = resolve(dirname, './schema.prisma');
try {
	unlinkSync(temp_db);
} catch (_) {
	/* ignore */
}

// 1. Pull current schema
const current = await client.execute(
	"SELECT * FROM sqlite_schema WHERE name != 'sqlite_sequence'",
);

// 2. create dummy db with that schema
const db = new Database(temp_db);
for (const item of current.rows) {
	if (item.sql && item.sql !== 'null') {
		db.prepare(item.sql).run();
	}
}
db.close();

// 3. generate migration on dummy db
let migration;
try {
	migration = spawnSync(
		'npx',
		[
			'prisma',
			'migrate',
			'diff',
			'--from-url',
			`file:${temp_db}`,
			'--to-schema-datamodel',
			schema,
			'--script',
		],
		{ encoding: 'utf-8' },
	);
} finally {
	unlinkSync(temp_db);
}
if (migration.status !== 0) {
	console.error('Prisma error:');
	console.error(migration.stderr);
	process.exit(0);
}
if (migration.stdout.includes('-- This is an empty migration.')) {
	console.log('No changes');
	process.exit(0);
}

const migration_sql = migration.stdout;

console.log(migration_sql);

// 4. apply migration on actual db
try {
	await client.executeMultiple(migration_sql);
} catch (e) {
	console.error('Migration failed', e);
	process.exit(1);
}

spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
