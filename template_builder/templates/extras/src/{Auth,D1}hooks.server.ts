import { initDb } from '$lib/db';
import { initAuth, validateSessionToken } from '$lib/auth';
import { dev } from '$app/environment';

export async function handle({ event, resolve }) {
	const db = event.platform!.env.DB;
	initAuth(event.url.origin);
	initDb(db);
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
