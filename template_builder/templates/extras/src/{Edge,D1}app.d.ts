/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
	interface Platform {
		env: {
			// KV: KVNamespace;
			DB: D1Database;
		};
		context: ExecutionContext;
	}

	// interface Locals {}
	// interface Error {}
	// interface Session {}
	// interface Stuff {}
}
