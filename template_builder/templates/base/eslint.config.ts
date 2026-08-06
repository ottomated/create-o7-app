import globals from 'globals';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import ts from 'typescript-eslint';

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
				svelteConfig: {
					experimental: { async: true },
					kit: {
						experimental: { remoteFunctions: true },
					},
				},
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
			'worker-configuration.d.ts',
			'db/schema.d.ts',
		],
	},
);
