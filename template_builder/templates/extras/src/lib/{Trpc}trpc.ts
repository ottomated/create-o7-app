import { createTRPCSvelte } from 'trpc-svelte-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '$lib/server/routes/_app';
import { parse, stringify, uneval } from 'devalue';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

export const transformer = {
	input: {
		serialize: (object: unknown) => stringify(object),
		deserialize: (object: string) => parse(object),
	},
	output: {
		serialize: (object: unknown) => uneval(object),
		deserialize: (object: string) => (0, eval)(`(${object})`),
	},
};

export const trpc = createTRPCSvelte<AppRouter>({
	links: [
		httpBatchLink({
			url: '/api/trpc',
			transformer,
		}),
	],
});

export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
