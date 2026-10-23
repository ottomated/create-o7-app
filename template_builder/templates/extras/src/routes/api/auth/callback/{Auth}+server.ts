import { dev } from '$app/env';
import { CLIENT_ID, CLIENT_SECRET } from '$app/env/private';
import { error, redirect } from '@sveltejs/kit';

import { create_session } from '#lib/server/auth.js';
import { db, make_id } from '#lib/server/db/index.js';

export const GET = async (event) => {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const stored_state = event.cookies.get('oauth_state') ?? null;

	if (!code || !state || !stored_state || state !== stored_state) {
		return new Response(null, {
			status: 400,
		});
	}

	let tokens: {
		access_token: string;
		refresh_token: string;
		expires_in: number;
		scope?: string[];
	};
	try {
		const res = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body: new URLSearchParams({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: `${event.url.origin}/api/auth/callback`,
			}),
		});
		if (res.status !== 200) {
			const data = await res.json<{ error: string }>();
			throw new Error(`Failed to get access token: ${data.error}`);
		}
		tokens = await res.json();
	} catch (err) {
		console.error('Invalid code or client ID', err);
		return error(400, 'Authentication failed');
	}

	const twitch_user = await fetch('https://api.twitch.tv/helix/users', {
		headers: {
			Authorization: `Bearer ${tokens.access_token}`,
			'Client-ID': CLIENT_ID,
		},
	})
		.then((r) => r.json() as Promise<TwitchUsers>)
		.then((u) => u.data[0]);

	if (!twitch_user) error(400, 'No user found');

	const { user_id } = await db
		.insertInto('User')
		.values({
			id: make_id('u'),
			twitch_id: twitch_user.id,
			username: twitch_user.display_name,
			profile_image_url: twitch_user.profile_image_url,
		})
		.onConflict((oc) =>
			oc.column('twitch_id').doUpdateSet((eb) => ({
				username: eb.ref('excluded.username'),
				profile_image_url: eb.ref('excluded.profile_image_url'),
			})),
		)
		.returning('id as user_id')
		.executeTakeFirstOrThrow();

	const { session, token } = await create_session(user_id);

	event.cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: session.expires_at,
		secure: !dev,
	});
	redirect(303, '/');
};

export interface TwitchUsers {
	data: Array<{
		id: string;
		login: string;
		display_name: string;
		type: 'admin' | 'global_mod' | 'staff' | '';
		broadcaster_type: 'partner' | 'affiliate' | '';
		description: string;
		profile_image_url: string;
		offline_image_url: string;
		created_at: string;
	}>;
}
