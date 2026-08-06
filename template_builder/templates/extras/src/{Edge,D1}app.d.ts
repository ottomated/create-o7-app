declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env;
			ctx: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
