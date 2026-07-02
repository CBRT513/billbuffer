import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Static PWA, no backend: prerender the shell and provide an SPA fallback for
		// client-only routes added in later PRs. Nothing is served from a server.
		adapter: adapter({ fallback: 'index.html', precompress: false, strict: false })
	}
};

export default config;
