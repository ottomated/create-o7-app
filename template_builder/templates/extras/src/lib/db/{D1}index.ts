import { Kysely, type RawBuilder, sql } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { DB } from './schema';

export const getDb = (database: D1Database) =>
	new Kysely<DB>({
		dialect: new D1Dialect({
			database,
		}),
	});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
