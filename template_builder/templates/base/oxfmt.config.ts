import { defineConfig } from 'oxfmt';

export default defineConfig({
	singleQuote: true,
	tabWidth: 2,
	useTabs: true,
	sortTailwindcss: true,
	svelte: true,
	ignorePatterns: ['worker-configuration.d.ts', 'db/schema.d.ts'],
	overrides: [
		{
			files: ['wrangler.jsonc'],
			options: { trailingComma: 'none' },
		},
	],
});
