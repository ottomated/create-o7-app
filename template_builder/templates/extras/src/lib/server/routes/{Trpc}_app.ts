import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const appRouter = router({
	greeting: publicProcedure
		.input(
			z.object({
				name: z.string().optional(),
			})
		)
		.query(({ input }) => {
			return `Welcome to ${input.name ?? 'the world'}!`;
		}),
});

export type AppRouter = typeof appRouter;
