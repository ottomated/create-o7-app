import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

const temp_db = resolve(dirname, './temp.db');
const migration_file = resolve(dirname, './temp.sql');
const schema = resolve(dirname, './schema.prisma');
try {
	unlinkSync(temp_db);
} catch (_) {
	/* ignore */
}

// 1. Pull current schema
const current_res = JSON.parse(
	spawnSync(
		'npx',
		[
			'wrangler',
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
if (current_res.error) {
	console.error(current_res.error);
	console.error('Have you put your database ID in wrangler.toml?');
	process.exit(1);
}
const current = current_res[0].results;

// 2. create dummy db with that schema
const db = new Database(temp_db);
for (const item of current) {
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

const migration_sql = migration.stdout
	.replace(/^PRAGMA foreign_keys=OFF;/gm, 'PRAGMA defer_foreign_keys=true;')
	.replace(/^PRAGMA foreign_keys=ON;/gm, 'PRAGMA defer_foreign_keys=false;')
	.replace(/^PRAGMA foreign_key_check;/gm, '');
console.log(migration_sql);

writeFileSync(migration_file, migration_sql);

// 4. apply migration on actual db
let res;
try {
	res = spawnSync(
		`npx`,
		[
			'wrangler',
			'd1',
			'execute',
			database_name,
			local_flag,
			'--file',
			migration_file,
		],
		{ stdio: 'inherit' },
	);
} finally {
	unlinkSync(migration_file);
}

if (res.status !== 0) {
	console.error('Migration failed');
	process.exit(res.status);
}

spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
