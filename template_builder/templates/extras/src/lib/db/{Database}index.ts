import { Kysely, type RawBuilder, sql, SqliteDialect } from 'kysely';
import { Database } from 'better-sqlite3';
import type { DB } from './schema';

export const db = new Kysely<DB>({
	dialect: new SqliteDialect({
		database: new Database('db.sqlite'),
	}),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
