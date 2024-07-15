import { z } from 'zod';

export const clientToServerSchema = z.object({
	type: z.literal('broadcast'),
	payload: z.string(),
});

export type ClientToServer = z.infer<typeof clientToServerSchema>;

export type ServerToClient = {
	type: 'message';
	payload: string;
};
