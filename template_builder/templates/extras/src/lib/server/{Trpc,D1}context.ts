import type { RequestEvent } from '@sveltejs/kit';
import type { inferAsyncReturnType } from '@trpc/server';
import { getDb } from '$lib/db';
import { dev } from '$app/environment';

export async function createContext(event: RequestEvent) {
	if (dev) {
		await createDevDatabase(event);
	}
	return {
		db: getDb(event.platform!.env.DB),
	};
}

async function createDevDatabase(event: RequestEvent) {
	const global = globalThis as typeof globalThis & { d1?: D1Database };
	if (global.d1) {
		event.platform = {
			env: {
				DB: global.d1,
			},
		};
		return;
	}
	const { createSQLiteDB } = await import('@miniflare/shared');
	const { D1Database: D1Miniflare, D1DatabaseAPI } = await import(
		'@miniflare/d1'
	);
	const { spawnSync } = await import('child_process');
	const { fileURLToPath } = await import('url');
	const { resolve } = await import('path');
	const schema = resolve(
		fileURLToPath(import.meta.url),
		'../../../../prisma/schema.prisma',
	);
	const db = await createSQLiteDB(':memory:');
	const d1 = new D1Miniflare(new D1DatabaseAPI(db)) as unknown as D1Database;

	const migration = spawnSync(
		'npx',
		[
			'prisma',
			'migrate',
			'diff',
			'--from-empty',
			'--to-schema-datamodel',
			schema,
			'--script',
		],
		{ encoding: 'utf-8' },
	);
	const statements = migration.stdout
		.replace(/--.+$/gm, '')
		.trim()
		.split(';\n')
		.map((s) => s.replace(/\n/g, '').trim());
	for (const statement of statements) {
		await d1.exec(statement);
	}
	global.d1 = d1;

	event.platform = {
		env: {
			DB: global.d1,
		},
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
