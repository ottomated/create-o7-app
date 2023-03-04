module.exports = {
	root: true,
	env: {
		browser: true,
		es2017: true,
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtension: ['.svelte'],
	},
	extends: [
		'eslint:recommended',
		'plugin:prettier/recommended',
		'plugin:svelte/recommended',
	],
	plugins: ['@typescript-eslint'],
	overrides: [
		{
			files: ['*.cjs'],
			env: {
				node: true,
			},
		},
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
			rules: {
				'no-self-assign': 'off',
			},
		},
		{
			files: ['*.ts'],
			extends: ['plugin:@typescript-eslint/recommended'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				tsconfigRootDir: __dirname,
				project: ['./tsconfig.json'],
			},
			rules: {
				'@typescript-eslint/no-floating-promises': 'error',
				'@typescript-eslint/no-unused-vars': [
					'warn',
					{
						argsIgnorePattern: '^_',
					},
				],
			},
		},
	],
	settings: {
		'svelte3/typescript': () => require('typescript'),
	},
	rules: {
		'prettier/prettier': 'warn',
	},
};
