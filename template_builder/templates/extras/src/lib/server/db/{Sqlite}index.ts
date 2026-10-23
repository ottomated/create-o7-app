import { building } from '$app/env';
import { Kysely, type RawBuilder, sql, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { DATABASE_URL } from '$app/env/private';
import type { DB } from './schema';
import { customAlphabet } from 'nanoid';
import * as v from 'valibot';

export const db = building
	? (undefined as never)
	: new Kysely<DB>({
			dialect: new SqliteDialect({
				database: new Database(DATABASE_URL),
			}),
		});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}

export function v_id<Prefix extends string>(prefix: Prefix) {
	return v.pipe(
		v.string(),
		v.startsWith(`${prefix}_`) as v.BaseValidation<
			string,
			`${Prefix}_${string}`,
			v.StartsWithIssue<string, `${Prefix}_`>
		>,
	);
}

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz');
export function make_id<Prefix extends string>(prefix: Prefix) {
	return `${prefix}_${nanoid()}` as const;
}

export type { DB };
