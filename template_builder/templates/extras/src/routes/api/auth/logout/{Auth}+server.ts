import { invalidateSession } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals }) => {
	if (locals.session) await invalidateSession(locals.session.id);
	redirect(302, '/');
};
