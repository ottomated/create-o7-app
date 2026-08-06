import { Kysely, type RawBuilder, sql } from 'kysely';
import { LibsqlDialect } from 'kysely-libsql';
import type { DB } from './schema';
import { dev } from '$app/env';
import { TURSO_TOKEN, TURSO_URL } from '$app/env/private';
import { createClient } from '@libsql/client';

if (!TURSO_URL || !TURSO_TOKEN) {
	if (dev) {
		throw new Error('TURSO_URL and TURSO_TOKEN must be set');
	} else {
		console.warn('TURSO_URL and TURSO_TOKEN must be set');
	}
}

export const db_client = createClient({
	url: TURSO_URL,
	authToken: TURSO_TOKEN,
});

export const db = new Kysely<DB>({
	dialect: new LibsqlDialect({ client: db_client }),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
