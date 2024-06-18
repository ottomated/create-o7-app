/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			/* Example Cloudflare bindings */
			// env: {
			// 	KV: KVNamespace;
			// };
			context: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
