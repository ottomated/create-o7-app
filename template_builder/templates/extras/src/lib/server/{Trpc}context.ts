import type { inferAsyncReturnType } from '@trpc/server';
// import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { RequestEvent } from '../../../routes/api/trpc/[...trpc]/$types';

export async function createContext(event: RequestEvent) {
	return {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		env: event.platform?.env,
		context: event.platform?.context,
	};
}
export type Context = inferAsyncReturnType<typeof createContext>;
