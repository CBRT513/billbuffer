import { defineConfig, devices } from '@playwright/test';

// PWA / offline smoke tests. These run against the REAL production build served by
// `vite preview` (a service worker only works on a built, https/localhost origin), so
// the webServer builds then previews. Kept separate from the vitest unit suite
// (`npm test`); run with `npm run test:e2e`.

const PORT = 4173; // vite preview default

export default defineConfig({
	testDir: './e2e',
	// Offline/service-worker state is per-context and the single preview server is
	// shared, so run serially for determinism.
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview',
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
