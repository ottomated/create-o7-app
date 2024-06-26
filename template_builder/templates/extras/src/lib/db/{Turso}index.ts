import { Kysely, type RawBuilder, sql } from 'kysely';
import { LibsqlDialect } from '@ottomated/kysely-libsql';
import type { DB } from './schema';
import { TURSO_TOKEN, TURSO_URL } from '$env/static/private';
import { createClient } from '@libsql/client';

if (!TURSO_URL || !TURSO_TOKEN) {
	throw new Error('TURSO_URL and TURSO_TOKEN must be set');
}

export const dbClient = createClient({
	url: TURSO_URL,
	authToken: TURSO_TOKEN,
});

export const db = new Kysely<DB>({
	dialect: new LibsqlDialect({ client: dbClient }),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
