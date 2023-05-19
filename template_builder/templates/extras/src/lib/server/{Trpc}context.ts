import type { RequestEvent } from '@sveltejs/kit';
import type { inferAsyncReturnType } from '@trpc/server';

export async function createContext(_opts: RequestEvent) {
	return {};
}

export type Context = inferAsyncReturnType<typeof createContext>;
