import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { unlinkSync, writeFileSync } from 'node:fs';
import 'dotenv/config';

const databaseName = process.env.DATABASE_NAME;
if (!databaseName) {
	console.error('DATABASE_NAME not set (must be the name of a D1 database)');
	process.exit(1);
}

const tempDb = resolve(__dirname, './temp.db');
const migrationFile = resolve(__dirname, './temp.sql');
try {
	unlinkSync(tempDb);
} catch (_) {
	/* ignore */
}
const schema = resolve(__dirname, './schema.prisma');

// 1. Pull current schema
const current = JSON.parse(
	spawnSync(
		'npx',
		[
			'wrangler',
			'd1',
			'execute',
			databaseName,
			'--command',
			"SELECT * FROM sqlite_schema WHERE name != '_cf_KV' AND name != 'sqlite_sequence'",
			'--json',
		],
		{ encoding: 'utf-8' },
	).stdout,
)[0].results;

// 2. create dummy db with that schema
const db = new Database(tempDb);
for (const item of current) {
	if (item.sql) {
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
if (migration.stdout.includes('-- This is an empty migration.')) {
	console.log('No changes');
	unlinkSync(tempDb);
	process.exit(0);
}

const migrationSql = migration.stdout
	.replace(/^PRAGMA foreign_keys=OFF;/gm, 'PRAGMA defer_foreign_keys=true;')
	.replace(/^PRAGMA foreign_keys=ON;/gm, 'PRAGMA defer_foreign_keys=false;')
	.replace(/^PRAGMA foreign_key_check;/gm, '');
console.log(migrationSql);

writeFileSync(migrationFile, migrationSql);

// 4. apply migration on actual db
const res = spawnSync(
	`npx`,
	['wrangler', 'd1', 'execute', databaseName, '--file', migrationFile],
	{ stdio: 'inherit' },
);

unlinkSync(tempDb);
unlinkSync(migrationFile);

if (res.status !== 0) {
	console.error('Migration failed');
	process.exit(res.status);
}

spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
