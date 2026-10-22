import { dev } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';

import { validate_session_token } from '#lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const session_token = event.cookies.get('session');
	const { session, user } = await validate_session_token(session_token);
	event.locals.user = user;
	event.locals.session = session;

	if (session) {
		event.cookies.set('session', session_token!, {
			httpOnly: true,
			sameSite: 'lax',
			expires: session.expires_at,
			secure: !dev,
		});
	} else {
		event.cookies.delete('session', {
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
		});
	}

	return resolve(event);
};
