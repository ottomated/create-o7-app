import { Kysely, type RawBuilder, sql } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { DB } from './schema';
import * as v from 'valibot';
import { env } from 'cloudflare:workers';

export const db = Kysely<DB>({
	dialect: new D1Dialect({
		database: env.DB,
	}),
})

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
