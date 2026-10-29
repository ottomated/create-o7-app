import { o7Favicon } from '@o7/favicon/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		o7Favicon({ path: './favicon.png' }),
		sveltekit({
			adapter: adapter(),
			experimental: {
				remoteFunctions: true,
			},
			compilerOptions: {
				experimental: { async: true },
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
		}),
	],
});
