import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Compile-time version/build stamp for the Privacy screen + feedback email. Plain string
// replacement — no runtime dependency, no network. The git short SHA falls back to
// "local" where git isn't available (e.g. a source tarball).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
function gitBuild(): string {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'local';
	}
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__APP_BUILD__: JSON.stringify(gitBuild())
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
