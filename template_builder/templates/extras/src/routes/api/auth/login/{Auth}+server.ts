import { redirect } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { twitch } from '$lib/auth';
import { dev } from '$app/environment';

export const GET = async (event) => {
	const state = generateState();
	const url = twitch.createAuthorizationURL(state, []);

	event.cookies.set('oauth_state', state, {
		path: '/',
		secure: !dev,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax',
	});

	redirect(302, url);
};
