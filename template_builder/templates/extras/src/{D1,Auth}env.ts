import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_NAME: {},
	CLIENT_ID: {},
	CLIENT_SECRET: {},
});
