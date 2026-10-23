import { building } from '$app/env';
import { defineEnvVars, type EnvVarConfig } from '@sveltejs/kit/env';
import * as v from 'valibot';

// Helper to make variables optional while the app is building
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runtime<T extends EnvVarConfig<any>>(config: T): T {
	if (!building) return config;

	return {
		...config,
		schema: v.optional(v.string(), ''),
	};
}

export const variables = defineEnvVars({
	CLIENT_ID: runtime({}),
	CLIENT_SECRET: runtime({}),
});
