import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { ServerToClient, clientToServerSchema } from 'common';

export class SocketObject extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	webSocketMessage(
		_ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> {
		if (typeof message !== 'string') return;
		const parsed = clientToServerSchema.safeParse(JSON.parse(message));
		if (!parsed.success) return;
		const { type, payload } = parsed.data;
		if (type === 'broadcast') {
			const message = JSON.stringify({
				type: 'message',
				payload,
			} as ServerToClient);
			for (const ws of this.ctx.getWebSockets()) {
				ws.send(message);
			}
		}
	}

	async fetch(_req: Request): Promise<Response> {
		const { 0: client, 1: server } = new WebSocketPair();

		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}

const app = new Hono<{ Bindings: Env }>();

app.get('/ws/:room', (c) => {
	const upgrade = c.req.header('Upgrade');
	if (upgrade !== 'websocket') {
		c.status(426);
		return c.body('WebSocket connection required');
	}
	const id = c.env.SOCKET_OBJECT.idFromName(c.req.param('room'));
	const socket = c.env.SOCKET_OBJECT.get(id);
	return socket.fetch(c.req.raw);
});

export default app;
