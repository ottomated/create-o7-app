import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const isLocal = process.argv.includes('--local');
const localFlag = isLocal ? '--local' : '--remote';

let databaseName;

if (isLocal) {
	databaseName = 'DB';
} else {
	databaseName = process.env.DATABASE_NAME;
	if (!databaseName) {
		console.error('DATABASE_NAME not set (must be the name of a D1 database)');
		process.exit(1);
	}
}
const dirname = resolve(fileURLToPath(import.meta.url), '..');

const tempDb = resolve(dirname, './temp.db');
const migrationFile = resolve(dirname, './temp.sql');
try {
	unlinkSync(tempDb);
} catch (_) {
	/* ignore */
}
const schema = resolve(dirname, './schema.prisma');

// 1. Pull current schema
const currentRes = JSON.parse(
	spawnSync(
		'npx',
		[
			'wrangler',
			'd1',
			'execute',
			databaseName,
			localFlag,
			'--command',
			"SELECT * FROM sqlite_schema WHERE name != '_cf_KV' AND name != 'sqlite_sequence'",
			'--json',
		],
		{ encoding: 'utf-8' },
	).stdout,
);
if (currentRes.error) {
	console.error(currentRes.error);
	console.error('Have you put your database ID in wrangler.toml?');
	process.exit(1);
}
const current = currentRes[0].results;

// 2. create dummy db with that schema
const db = new Database(tempDb);
for (const item of current) {
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

const migrationSql = migration.stdout
	.replace(/^PRAGMA foreign_keys=OFF;/gm, 'PRAGMA defer_foreign_keys=true;')
	.replace(/^PRAGMA foreign_keys=ON;/gm, 'PRAGMA defer_foreign_keys=false;')
	.replace(/^PRAGMA foreign_key_check;/gm, '');
console.log(migrationSql);

writeFileSync(migrationFile, migrationSql);

// 4. apply migration on actual db
const res = spawnSync(
	`npx`,
	[
		'wrangler',
		'd1',
		'execute',
		databaseName,
		localFlag,
		'--file',
		migrationFile,
	],
	{ stdio: 'inherit' },
);

unlinkSync(tempDb);
unlinkSync(migrationFile);

if (res.status !== 0) {
	console.error('Migration failed');
	process.exit(res.status);
}

spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
