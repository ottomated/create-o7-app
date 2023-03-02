import { appRouter } from '$lib/server/routes/_app';
import { createContext } from '$lib/server/context';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { RequestHandler } from './$types';

const handler: RequestHandler = async (event) => {
	return fetchRequestHandler({
		endpoint: '/api/trpc',
		req: event.request,
		router: appRouter,
		createContext: createContext(event),
	});
};

export const GET = handler;
export const POST = handler;
