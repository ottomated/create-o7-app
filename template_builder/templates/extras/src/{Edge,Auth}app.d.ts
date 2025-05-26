declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env;
			context: ExecutionContext;
		}

		interface Locals {
			user: import('$lib/auth').User | null;
			session: import('$lib/auth').Session | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
