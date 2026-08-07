import type { Selectable } from 'kysely';
import { check_id, db, type DB } from '#lib/server/db';
import * as v from 'valibot';
import { nanoid } from 'nanoid';

const ONE_DAY = 1000 * 60 * 60 * 24;

const SESSION_EXPIRES_IN = ONE_DAY * 10;

export async function createSession(
	userId: `u_${string}`,
): Promise<{ session: Session; token: string }> {
	const id = `s_${nanoid()}` as const;

	const secret = new Uint8Array(32);
	crypto.getRandomValues(secret);

	const secretHash = new Uint8Array(await crypto.subtle.digest('SHA-256', secret));

	const token = `${id}.${secret.toBase64()}`;

	const now = Date.now();
	const session: Session = {
		id,
		userId,
		expiresAt: new Date(now + SESSION_EXPIRES_IN),
	};
	const unixNow = Math.floor(now / 1000);
	await db
		.insertInto('Session')
		.values({
			id: session.id,
			user_id: session.userId,
			hash: secretHash,
			last_verified_at: unixNow,
			created_at: unixNow,
		})
		.execute();
	return { session, token };
}

const sessionTokenSchema = v.pipe(
	v.string(),
	v.transform((token) => token.split('.')),
	v.strictTuple([
		v.pipe(v.string(), v.length(21), check_id('s')),
		v.pipe(
			v.string(),
			v.rawTransform(({ dataset, NEVER }) => {
				try {
					return Uint8Array.fromBase64(dataset.value);
				} catch {
					return NEVER;
				}
			}),
		),
	]),
);
const invalid_session = Object.freeze({ session: null, user: null });

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const tokenResult = v.safeParse(sessionTokenSchema, token);
	if (!tokenResult.success) return invalid_session;

	const [sessionId, secret] = tokenResult.output;

	const row = await db
		.selectFrom('Session as s')
		.innerJoin('User as u', 'u.id', 's.user_id')
		.select(['s.id', 's.user_id', 's.hash', 's.last_verified_at', 'u.twitch_id', 'u.username'])
		.where('s.id', '=', sessionId)
		.executeTakeFirst();

	if (!row) {
		return invalid_session;
	}

	const now = Date.now();
	const sinceLastVerified = now - row.last_verified_at * 1000;
	if (sinceLastVerified >= SESSION_EXPIRES_IN) {
		await invalidateSession(row.id);
		return invalid_session;
	}

	const secretHash = new Uint8Array(await crypto.subtle.digest('SHA-256', secret));
	const secretCorrect = constantTimeEqual(secretHash, row.hash);
	if (!secretCorrect) {
		return { session: null, user: null };
	}

	if (sinceLastVerified >= 60 * 60 * 1000) {
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
			userId: row.user_id,
			expiresAt: new Date(row.last_verified_at + SESSION_EXPIRES_IN),
		},
		user: {
			id: row.user_id,
			twitch_id: row.twitch_id,
			username: row.username,
		},
	};
}

export async function invalidateSession(sessionId: `s_${string}`): Promise<void> {
	await db.deleteFrom('Session').where('id', '=', sessionId).execute();
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}
	let c = 0;
	for (let i = 0; i < a.byteLength; i++) {
		c |= a[i] ^ b[i];
	}
	return c === 0;
}

export type SessionValidationResult = { session: Session; user: User } | typeof invalid_session;

export type Session = {
	id: `s_${string}`;
	userId: `u_${string}`;
	expiresAt: Date;
};

export type User = Selectable<DB['User']>;
