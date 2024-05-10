import globals from 'globals';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

const svelteParser = await import(
	eslintPluginSvelte.configs.base.overrides[0].parser
);

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginSvelte.configs['flat/recommended'],
	...eslintPluginSvelte.configs['flat/prettier'],
	prettierRecommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2017,
			},
		},
	},
	{
		files: ['**/*.cjs', '**/*.mjs'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		rules: {
			'prettier/prettier': 'warn',
		},
	},
	{ ignores: ['**/.svelte-kit'] },
);
