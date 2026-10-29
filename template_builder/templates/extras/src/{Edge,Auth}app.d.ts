declare global {
	namespace App {
		interface Locals {
			user: import('#lib/server/auth.ts').User | null;
			session: import('#lib/server/auth.ts').Session | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
