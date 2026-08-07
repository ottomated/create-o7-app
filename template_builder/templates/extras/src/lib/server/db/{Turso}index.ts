import { Kysely, type RawBuilder, sql } from 'kysely';
import { LibsqlDialect } from 'kysely-libsql';
import type { DB } from './schema';
import { TURSO_TOKEN, TURSO_URL } from '$app/env/private';
import { createClient } from '@libsql/client';
import * as v from 'valibot';

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

export function check_id<Prefix extends string>(prefix: Prefix) {
	return v.startsWith(prefix + '_') as v.BaseValidation<
		string,
		`${Prefix}_${string}`,
		v.StartsWithIssue<string, `${Prefix}_`>
	>;
}

export type { DB };

