import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {},
	CLIENT_ID: {},
	CLIENT_SECRET: {},
});
