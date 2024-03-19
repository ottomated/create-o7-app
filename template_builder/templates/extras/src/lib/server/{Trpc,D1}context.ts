import type { RequestEvent } from '@sveltejs/kit';
import type { inferAsyncReturnType } from '@trpc/server';
import { getDb } from '$lib/db';

export async function createContext(event: RequestEvent) {
	return {
		db: getDb(event.platform!.env.DB),
	};
}

export type Context = inferAsyncReturnType<typeof createContext>;
