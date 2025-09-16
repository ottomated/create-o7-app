import { router, publicProcedure } from '../trpc';

export const appRouter = router({
	me: publicProcedure.query(({ ctx }) => {
		return ctx.user;
	}),
});

export type AppRouter = typeof appRouter;
