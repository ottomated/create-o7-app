import type { inferAsyncReturnType } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { RequestEvent } from '@sveltejs/kit';

export function createContext(event: RequestEvent) {
	return (_opts: FetchCreateContextFnOptions) => {
		return {
			env: event.platform?.env,
			context: event.platform?.context,
		};
	};
}
export type Context = inferAsyncReturnType<
	inferAsyncReturnType<typeof createContext>
>;
