/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
	interface Platform {
		env: {
			// KV: KVNamespace;
		};
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
