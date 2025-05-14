import type { RequestEvent } from '@sveltejs/kit';

export async function createContext(event: RequestEvent) {
	return {
		user: event.locals.user,
		session: event.locals.session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
