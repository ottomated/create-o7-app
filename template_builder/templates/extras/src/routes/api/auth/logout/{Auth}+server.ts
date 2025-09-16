import { invalidateSession } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export const GET = async ({ locals }) => {
	if (locals.session) await invalidateSession(locals.session.id);
	redirect(302, resolve('/'));
};
