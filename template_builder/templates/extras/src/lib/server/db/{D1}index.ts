import { building } from '$app/env';
import { Kysely, type RawBuilder, sql } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { DB } from './schema';
import { customAlphabet } from 'nanoid';
import * as v from 'valibot';
import { env } from 'cloudflare:workers';

export const db = building ? (undefined as never) : Kysely<DB>({
	dialect: new D1Dialect({
		database: env.DB,
	}),
})

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
