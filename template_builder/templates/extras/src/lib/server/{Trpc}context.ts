import type { RequestEvent } from '@sveltejs/kit';

export async function createContext(_event: RequestEvent) {
	return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
