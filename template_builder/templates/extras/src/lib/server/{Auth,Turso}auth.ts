import type { Selectable } from 'kysely';
import { Lucia } from 'lucia';
import { LibSQLAdapter } from '@lucia-auth/adapter-sqlite';
import { dev } from '$app/environment';
import type { DB } from '$lib/db/schema';
import { Twitch } from 'arctic';
import { CLIENT_ID, CLIENT_SECRET } from '$env/static/private';
import { dbClient } from '$lib/db';

const adapter = new LibSQLAdapter(dbClient, {
	user: 'User',
	session: 'Session',
});

export const lucia = new Lucia(adapter, {
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
export let twitch: Twitch;

export function initLucia(origin: string) {
	if (twitch) return;
	twitch = new Twitch(CLIENT_ID, CLIENT_SECRET, origin + '/api/auth/callback');
}

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: Selectable<DB['User']>;
	}
}
