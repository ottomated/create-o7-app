declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env;
			context: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
