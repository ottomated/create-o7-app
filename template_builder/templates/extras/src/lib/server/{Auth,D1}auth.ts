import type { Selectable } from 'kysely';
import { Lucia } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';
import { dev } from '$app/environment';
import type { DB } from '$lib/db/schema';
import { Twitch } from 'arctic';
import { CLIENT_ID, CLIENT_SECRET } from '$env/static/private';

export let lucia: NonNullable<ReturnType<typeof initLucia>>;
export let twitch: Twitch;

export function initLucia(db: D1Database, origin: string) {
	if (lucia) return;
	const adapter = new D1Adapter(db, {
		user: 'User',
		session: 'Session',
	});
	const l = new Lucia(adapter, {
		sessionCookie: {
			attributes: {
				secure: !dev,
			},
		},
		getUserAttributes(db) {
			return {
				twitchId: db.twitch_id,
				username: db.username,
			};
		},
	});
	lucia = l;
	twitch = new Twitch(CLIENT_ID, CLIENT_SECRET, origin + '/api/auth/callback');
	return l;
}

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: Selectable<DB['User']>;
	}
}
