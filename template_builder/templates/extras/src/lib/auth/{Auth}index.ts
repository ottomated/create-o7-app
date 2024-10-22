import { Twitch } from 'arctic';
import { Base32Encoding, encodeHex } from 'oslo/encoding';
import { generateRandomString, sha256 } from 'oslo/crypto';
import type { Selectable } from 'kysely';
import { db } from '$lib/db';
import { CLIENT_ID, CLIENT_SECRET } from '$env/static/private';
import type { DB } from '$lib/db/schema';

const ONE_DAY = 1000 * 60 * 60 * 24;
const base32 = new Base32Encoding('abcdefghijklmnopqrstuvwxyz234567');

export function generateId(length = 15): string {
	return generateRandomString(length, 'abcdefghijklmnopqrstuvwxyz0123456789');
}

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = base32.encode(bytes, {
		includePadding: false,
	});
	return token;
}

export async function createSession(
	token: string,
	userId: string,
): Promise<Session> {
	const sessionId = encodeHex(await sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + ONE_DAY * 7),
	};
	await db
		.insertInto('Session')
		.values({
			id: session.id,
			user_id: session.userId,
			expires_at: Math.floor(session.expiresAt.getTime() / 1000),
		})
		.execute();
	return session;
}

export async function validateSessionToken(
	token: string,
): Promise<SessionValidationResult> {
	const sessionId = encodeHex(await sha256(new TextEncoder().encode(token)));
	const row = await db
		.selectFrom('Session as s')
		.innerJoin('User as u', 'u.id', 's.user_id')
		.select(['s.id', 's.user_id', 's.expires_at', 'u.twitch_id', 'u.username'])
		.where('s.id', '=', sessionId)
		.executeTakeFirst();
	if (!row) {
		return { session: null, user: null };
	}
	const session: Session = {
		id: row.id,
		userId: row.user_id,
		expiresAt: new Date(row.expires_at * 1000),
	};
	if (Date.now() >= session.expiresAt.getTime()) {
		await db.deleteFrom('Session').where('id', '=', session.id).execute();
		return { session: null, user: null };
	}
	const user: User = {
		id: row.user_id,
		twitch_id: row.twitch_id,
		username: row.username,
	};
	if (Date.now() >= session.expiresAt.getTime() - ONE_DAY * 15) {
		session.expiresAt = new Date(Date.now() + ONE_DAY * 30);
		await db
			.updateTable('Session')
			.set({
				expires_at: Math.floor(session.expiresAt.getTime() / 1000),
			})
			.where('id', '=', session.id)
			.execute();
	}
	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.deleteFrom('Session').where('id', '=', sessionId).execute();
}

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

export type User = Selectable<DB['User']>;

export let twitch: Twitch;
export function initAuth(origin: string) {
	if (twitch) return;
	twitch = new Twitch(CLIENT_ID, CLIENT_SECRET, origin + '/api/auth/callback');
}
