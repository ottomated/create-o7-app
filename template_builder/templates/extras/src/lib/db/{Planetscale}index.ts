import { Kysely, type RawBuilder, sql } from 'kysely';
import { PlanetScaleDialect, inflateDates } from 'kysely-planetscale';
import type { DB } from './schema';
import {
	DATABASE_HOST,
	DATABASE_USERNAME,
	DATABASE_PASSWORD,
} from '$env/static/private';

export const db = new Kysely<DB>({
	dialect: new PlanetScaleDialect({
		host: DATABASE_HOST,
		username: DATABASE_USERNAME,
		password: DATABASE_PASSWORD,
		cast: (field, value) => {
			if (field.type === 'INT8' && value === '1') return true;
			if (field.type === 'INT8' && value === '0') return false;
			return inflateDates(field, value);
		},
	}),
});

export function json<T>(obj: T): RawBuilder<T> {
	return sql`${JSON.stringify(obj)}`;
}
