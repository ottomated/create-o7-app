declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env & {
				SOCKET_OBJECT: DurableObjectNamespace<
					import('../worker/src/worker').SocketObject
				>;
			};
			context: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
