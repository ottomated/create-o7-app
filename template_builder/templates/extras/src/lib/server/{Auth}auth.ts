import type { Selectable } from 'kysely';
import { nanoid } from 'nanoid';
import * as v from 'valibot';
import { v_id, db, type DB } from '#lib/server/db/index.ts';

const ONE_DAY = 1000 * 60 * 60 * 24;

const SESSION_EXPIRES_IN = ONE_DAY * 10;

export async function create_session(
	user_id: `u_${string}`,
): Promise<{ session: Session; token: string }> {
	const id = `s_${nanoid()}` as const;

	const secret = new Uint8Array(32);
	crypto.getRandomValues(secret);

	const secret_hash = new Uint8Array(await crypto.subtle.digest('SHA-256', secret));

	const token = `${id}.${secret.toBase64()}`;

	const now = Date.now();
	const session: Session = {
		id,
		user_id,
		expires_at: new Date(now + SESSION_EXPIRES_IN),
	};
	const unix_now = Math.floor(now / 1000);
	await db
		.insertInto('Session')
		.values({
			id: session.id,
			user_id: session.user_id,
			hash: secret_hash.buffer,
			last_verified_at: unix_now,
			created_at: unix_now,
		})
		.execute();
	return { session, token };
}

const session_token_schema = v.pipe(
	v.string(),
	v.transform((token) => token.split('.')),
	v.strictTuple([
		v_id('s'),
		v.pipe(
			v.string(),
			v.rawTransform((ctx) => {
				try {
					return Uint8Array.fromBase64(ctx.dataset.value);
				} catch {
					return ctx.NEVER;
				}
			}),
		),
	]),
);
const invalid_session = Object.freeze({ session: null, user: null });

export async function validate_session_token(
	token: string | undefined,
): Promise<SessionValidationResult> {
	if (!token) return invalid_session;
	const token_result = v.safeParse(session_token_schema, token);
	if (!token_result.success) return invalid_session;

	const [session_id, secret] = token_result.output;

	const row = await db
		.selectFrom('Session as s')
		.innerJoin('User as u', 'u.id', 's.user_id')
		.select(['s.id', 's.user_id', 's.hash', 's.last_verified_at', 'u.twitch_id', 'u.username'])
		.where('s.id', '=', session_id)
		.executeTakeFirst();

	if (!row) {
		return invalid_session;
	}

	const now = Date.now();
	const since_last_verified = now - row.last_verified_at * 1000;
	if (since_last_verified >= SESSION_EXPIRES_IN) {
		await invalidate_session(row.id);
		return invalid_session;
	}

	const secret_hash = new Uint8Array(await crypto.subtle.digest('SHA-256', secret));
	const secret_correct = constant_time_equal(secret_hash, row.hash);
	if (!secret_correct) {
		return invalid_session;
	}

	if (since_last_verified >= 60 * 60 * 1000) {
		row.last_verified_at = Math.floor(now / 1000);
		await db
			.updateTable('Session')
			.set({
				last_verified_at: row.last_verified_at,
			})
			.where('id', '=', row.id)
			.execute();
	}

	return {
		session: {
			id: row.id,
			user_id: row.user_id,
			expires_at: new Date(row.last_verified_at + SESSION_EXPIRES_IN),
		},
		user: {
			id: row.user_id,
			twitch_id: row.twitch_id,
			username: row.username,
		},
	};
}

export async function invalidate_session(session_id: `s_${string}`): Promise<void> {
	await db.deleteFrom('Session').where('id', '=', session_id).execute();
}

function constant_time_equal(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}
	let c = 0;
	for (let i = 0; i < a.byteLength; i++) {
		c |= a[i]! ^ b[i]!;
	}
	return c === 0;
}

export type SessionValidationResult = { session: Session; user: User } | typeof invalid_session;

export type Session = {
	id: `s_${string}`;
	user_id: `u_${string}`;
	expires_at: Date;
};

export type User = Selectable<DB['User']>;
