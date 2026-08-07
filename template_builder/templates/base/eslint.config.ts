import globals from 'globals';
import js from '@eslint/js';
import { loadConfig } from '@sveltejs/load-config';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import ts from 'typescript-eslint';

const svelte_config = await loadConfig('.');
if (!svelte_config || !('config' in svelte_config)) {
	throw new Error(`Failed to load Svelte config: ${svelte_config?.error}`);
}

export default defineConfig(
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2017,
			},
		},
	},
	{
		files: ['./*.{cjs,ts,js}', './prisma/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig: svelte_config.config,
			},
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			// '@typescript-eslint/naming-convention': [
			// 	'error',
			// 	{
			// 		selector: 'variableLike',
			// 		format: ['snake_case'],
			// 		trailingUnderscore: 'allow',
			// 		leadingUnderscore: 'allow',
			// 	},
			// 	{
			// 		selector: 'variable',
			// 		modifiers: ['destructured'],
			// 		format: null,
			// 	},
			// 	{
			// 		selector: 'variable',
			// 		modifiers: ['const', 'global'],
			// 		format: ['UPPER_CASE', 'snake_case'],
			// 		trailingUnderscore: 'allow',
			// 		leadingUnderscore: 'allow',
			// 	},
			// ],
		},
	},
	{
		ignores: [
			'**/.svelte-kit',
			'.wrangler/',
			'build/',
			'dist/',
			'**/worker-configuration.d.ts',
			'**/db/schema.d.ts',
		],
	},
);
