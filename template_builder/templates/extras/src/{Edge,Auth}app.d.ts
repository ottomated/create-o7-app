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

		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
		}
		// interface Error {}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
