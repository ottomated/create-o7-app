declare global {
	namespace App {
		// interface Platform {}
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
