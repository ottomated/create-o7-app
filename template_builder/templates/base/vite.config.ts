import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit({
		adapter: adapter(),
		experimental: {
			remoteFunctions: true,
		},
		compilerOptions: {
			async: true,
			runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
		},
	})],
});
