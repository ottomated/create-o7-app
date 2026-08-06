import { Kysely, type RawBuilder, sql, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { DATABASE_URL } from '$app/env/private';
import type { DB } from './schema';

export const sqlite = new Database(DATABASE_URL);

export const db = new Kysely<DB>({
	dialect: new SqliteDialect({
		database: sqlite,
	}),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
