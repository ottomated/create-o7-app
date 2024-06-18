/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
			};
			context: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
