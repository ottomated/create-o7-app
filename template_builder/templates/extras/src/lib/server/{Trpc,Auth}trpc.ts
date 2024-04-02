import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context';
import { transformer } from '$lib/trpc/transformer';

const t = initTRPC.context<Context>().create({
	transformer,
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
	if (!ctx.session || !ctx.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}
	return next({
		ctx: {
			user: ctx.user,
			session: ctx.session,
		},
	});
});
