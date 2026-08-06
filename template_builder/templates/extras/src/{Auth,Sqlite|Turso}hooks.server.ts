import { initAuth, validateSessionToken } from '$lib/auth';
import { dev } from '$app/environment';

export async function handle({ event, resolve }) {
	initAuth(event.url.origin);
	const sessionToken = event.cookies.get('session');
	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSessionToken(sessionToken);
	if (session) {
		event.cookies.set('session', sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			expires: session.expiresAt,
			secure: !dev,
		});
	} else {
		event.cookies.delete('session', {
			path: '/',
		});
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
}
