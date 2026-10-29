import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { CLIENT_ID } from '$app/env/private';

export const GET = async ({ url, cookies }) => {
	const state = crypto.getRandomValues(new Uint8Array(32)).toHex();

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: CLIENT_ID,
		state,
		redirect_uri: `${url.origin}/api/auth/callback`,
		scope: '',
	});
	const auth_url = `https://id.twitch.tv/oauth2/authorize?${params}`;

	const to = url.searchParams.get('to');
	if (to) {
		cookies.set('to', to, {
			path: '/',
			secure: !dev,
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: 'lax',
		});
	}
	cookies.set('oauth_state', state, {
		path: '/api/auth',
		secure: !dev,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax',
	});

	redirect(302, auth_url, { external: true });
};
