import { query, getRequestEvent, form } from '$app/server';
import { redirect } from '@sveltejs/kit';

import { invalidate_session } from '#lib/server/auth.ts';

export const get_me = query(() => {
	const { locals } = getRequestEvent();
	return locals.user;
});

export const log_out = form(async () => {
	const { locals } = getRequestEvent();
	if (locals.session) await invalidate_session(locals.session.id);

	redirect(303, '/');
});
