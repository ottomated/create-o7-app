import { Kysely, type RawBuilder, sql, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { DATABASE_URL } from '$app/env/private';
import type { DB } from './schema';
import * as v from 'valibot';

export const sqlite = new Database(DATABASE_URL);

export const db = new Kysely<DB>({
	dialect: new SqliteDialect({
		database: sqlite,
	}),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}

export function check_id<Prefix extends string>(prefix: Prefix) {
	return v.startsWith(prefix + '_') as v.BaseValidation<
		string,
		`${Prefix}_${string}`,
		v.StartsWithIssue<string, `${Prefix}_`>
	>;
}

export type { DB };
