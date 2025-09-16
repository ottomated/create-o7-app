import { OAuth2Tokens } from 'arctic';
import { db } from '$lib/db';
import { CLIENT_ID } from '$env/static/private';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import {
	createSession,
	generateId,
	generateSessionToken,
	twitch,
} from '$lib/auth';
import { dev } from '$app/environment';

export const GET = async (event) => {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('oauth_state') ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400,
		});
	}
	let tokens: OAuth2Tokens;
	try {
		tokens = await twitch.validateAuthorizationCode(code);
	} catch (err) {
		console.error('Invalid code or client ID', err);
		return error(400, 'Authentication failed');
	}

	const twitchUser = await fetch('https://api.twitch.tv/helix/users', {
		headers: {
			Authorization: `Bearer ${tokens.accessToken()}`,
			'Client-ID': CLIENT_ID,
		},
	})
		.then((r) => r.json() as Promise<TwitchUser>)
		.then((u) => u.data[0]);

	let user = await db
		.selectFrom('User')
		.select('id')
		.where('twitch_id', '=', twitchUser.id)
		.executeTakeFirst();

	if (!user) {
		user = {
			id: generateId(15),
		};
		await db
			.insertInto('User')
			.values({
				id: user.id,
				twitch_id: twitchUser.id,
				username: twitchUser.display_name,
			})
			.execute();
	}

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);

	event.cookies.set('session', sessionToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: session.expiresAt,
		secure: !dev,
	});
	redirect(302, resolve('/'));
};

interface TwitchUser {
	data: [
		{
			id: string;
			login: string;
			display_name: string;
			type: 'admin' | 'global_mod' | 'staff' | '';
			broadcaster_type: 'partner' | 'affiliate' | '';
			description: string;
			profile_image_url: string;
			offline_image_url: string;
			created_at: string;
		},
	];
}
