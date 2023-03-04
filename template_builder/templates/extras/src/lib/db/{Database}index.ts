import { Kysely, type RawBuilder, sql, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { DATABASE_URL } from '$env/static/private';
import type { DB } from './schema';

export const db = new Kysely<DB>({
	dialect: new SqliteDialect({
		database: new Database(DATABASE_URL),
	}),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
