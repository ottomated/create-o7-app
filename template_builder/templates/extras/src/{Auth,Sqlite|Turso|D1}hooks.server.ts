import { validateSessionToken } from '#lib/auth';
import { dev } from '$app/env';

export async function handle({ event, resolve }) {
	const sessionToken = event.cookies.get('session');
	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const { session, user } = await validateSessionToken(sessionToken);
		if (session) {
			event.cookies.set('session', sessionToken, {
				httpOnly: true,
				sameSite: 'lax',
				expires: session.expiresAt,
				secure: !dev,
			});
		} else {
			event.cookies.delete('session');
		}
		event.locals.user = user;
		event.locals.session = session;
	}

	return resolve(event);
}
