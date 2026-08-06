import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	TURSO_URL: {},
	TURSO_TOKEN: {},
	CLIENT_ID: {},
	CLIENT_SECRET: {},
});
