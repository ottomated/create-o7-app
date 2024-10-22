/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
			};
			context: ExecutionContext;
		}

		interface Locals {
			user: import('$lib/auth').User | null;
			session: import('$lib/auth').Session | null;
		}
		// interface Error {}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
