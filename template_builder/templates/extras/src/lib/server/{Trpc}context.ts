import type { inferAsyncReturnType } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext(_opts: FetchCreateContextFnOptions) {
	return {};
}

export type Context = inferAsyncReturnType<typeof createContext>;
