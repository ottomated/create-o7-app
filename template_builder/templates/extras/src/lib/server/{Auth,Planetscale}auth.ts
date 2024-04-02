import { Lucia } from 'lucia';
import { PlanetScaleAdapter } from '@lucia-auth/adapter-mysql';
import { dev } from '$app/environment';
import type { DB } from '$lib/db/schema';
import { Twitch } from 'arctic';
import { CLIENT_ID, CLIENT_SECRET } from '$env/static/private';
import { connect, cast } from '@planetscale/database';
import {
	DATABASE_HOST,
	DATABASE_USERNAME,
	DATABASE_PASSWORD,
} from '$env/static/private';

const adapter = new PlanetScaleAdapter(
	connect({
		host: DATABASE_HOST,
		username: DATABASE_USERNAME,
		password: DATABASE_PASSWORD,
		cast: (field, value) => {
			if (field.type === 'INT8' && value === '1') return true;
			if (field.type === 'INT8' && value === '0') return false;
			return cast(field, value);
		},
	}),
	{
		user: 'User',
		session: 'Session',
	}
);

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
		DatabaseUserAttributes: DB['User'];
	}
}
