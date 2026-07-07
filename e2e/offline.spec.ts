import { test, expect, type Page } from '@playwright/test';

// Product Promise #3 — "the app works without the internet." These smoke tests run
// against the real production build + service worker and prove the installed app
// boots and client-routes with the network fully off, and that the offline cache
// holds only the app shell / static assets — never user financial data (which lives
// in IndexedDB, on-device).

// This SW does not call clients.claim(), so the FIRST load is uncontrolled. Wait for
// the worker to be active (precache done) then reload once to put the page under SW
// control — the state a returning visitor is in, and what makes an offline launch work.
async function installAndControl(page: Page) {
	await page.goto('/');
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
	await page.reload();
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

const home = (page: Page) => page.getByRole('heading', { name: 'BillBuffer' });

// Every pathname currently held in Cache Storage, across all caches.
async function cachedPaths(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const paths: string[] = [];
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			for (const req of await cache.keys()) paths.push(new URL(req.url).pathname);
		}
		return paths.sort();
	});
}

test.describe('PWA offline smoke', () => {
	test('the built app loads online and registers a service worker', async ({ page }) => {
		await page.goto('/');
		await expect(home(page)).toBeVisible();
		await expect
			.poll(() => page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active)))
			.toBe(true);
	});

	test('after one online visit, the app shell launches with the network off', async ({
		page,
		context
	}) => {
		await installAndControl(page);
		await context.setOffline(true);

		await page.reload();

		await expect(home(page)).toBeVisible(); // booted entirely from the SW cache
	});

	test('navigation to a route with no prebuilt file falls back to the cached SPA shell', async ({
		page,
		context
	}) => {
		await installAndControl(page);
		await context.setOffline(true);

		// A client-only route with no static HTML file: offline, this must be served the
		// cached index.html shell (not a network error), from which the SPA client-routes.
		const response = await page.goto('/bills/deep/link');

		expect(response, 'offline navigation returned a response, not a network failure').toBeTruthy();
		expect(response!.ok()).toBe(true);
		expect(response!.headers()['content-type'] ?? '').toContain('text/html');
	});

	test('offline, /trust serves the real prerendered Trust document (not the SPA shell)', async ({
		page,
		context
	}) => {
		await installAndControl(page);

		// Visit online, then go fully offline and reload the same URL.
		await page.goto('/trust');
		await expect(page.getByRole('heading', { name: 'Why you can trust BillBuffer' })).toBeVisible();

		await context.setOffline(true);
		const response = await page.reload();

		expect(response, 'offline navigation returned a response').toBeTruthy();
		expect(response!.ok()).toBe(true);

		// The served bytes are the actual prerendered Trust HTML — its content is baked into
		// the document. The SPA shell contains none of this, so this proves /trust was NOT
		// replaced by the shell fallback.
		const body = await response!.text();
		expect(body).toContain('Why you can trust BillBuffer');
		expect(body).toContain('Made by Equilibrium Labs LLC');
		expect(body).toContain('feedback@billbuffer.app');

		// And it renders offline (static HTML + cached CSS, no JavaScript).
		await expect(page.getByRole('heading', { name: 'Why you can trust BillBuffer' })).toBeVisible();
		await expect(page.getByTestId('trust')).toContainText('Everything stays on your device');
	});

	test('offline, /legal/privacy serves the real prerendered Privacy Policy (not the SPA shell)', async ({
		page,
		context
	}) => {
		await installAndControl(page);

		await page.goto('/legal/privacy');
		await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();

		await context.setOffline(true);
		const response = await page.reload();

		expect(response, 'offline navigation returned a response').toBeTruthy();
		expect(response!.ok()).toBe(true);

		// The served bytes are the actual prerendered policy HTML, not the SPA shell.
		const body = await response!.text();
		expect(body).toContain('Privacy Policy');
		expect(body).toContain('Made by Equilibrium Labs LLC');
		expect(body).toContain('privacy@billbuffer.app');

		await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
		await expect(page.getByTestId('policy')).toContainText('No accounts');
	});

	test('the offline cache holds only the app shell and static assets', async ({ page }) => {
		await installAndControl(page);

		const names = await page.evaluate(() => caches.keys());
		expect(names.length).toBeGreaterThan(0);
		expect(names.every((n) => n.startsWith('billbuffer-'))).toBe(true);

		const paths = await cachedPaths(page);
		expect(paths).toContain('/'); // SPA shell, so an offline launch works
		const looksStatic = (p: string) =>
			p === '/' ||
			p === '/trust' || // prerendered public document — static HTML, never user data
			p === '/legal/privacy' || // prerendered public policy — static HTML, never user data
			p.startsWith('/_app/') ||
			/\.(js|css|svg|png|ico|json|webmanifest|woff2?|txt|html)$/.test(p);
		expect(paths.filter((p) => !looksStatic(p))).toEqual([]);
	});

	test('the service worker never runtime-caches a dynamic response (no user data can reach Cache Storage)', async ({
		page,
		context
	}) => {
		await installAndControl(page);

		// A dynamic, non-static endpoint returning a user-data-shaped 200 body, fulfilled
		// by the test. Fetching it FROM the controlled page drives it through the SW's
		// fetch handler — the exact path that must never write to Cache Storage. (The
		// earlier IndexedDB approach never touched the SW, so it proved nothing here.)
		const MARKER = 'USER-FINANCIAL-DATA-9c3f';
		const PROBE = '/__probe/user-data.json';
		await context.route(`**${PROBE}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ secret: MARKER })
			})
		);

		const before = await cachedPaths(page);

		const body = await page.evaluate((url) => fetch(url).then((r) => r.text()), PROBE);
		expect(body, 'the probe really returned the marker through the SW').toContain(MARKER);

		// The dynamic 200 was written to NO cache, and no cached body contains the marker.
		expect(await cachedPaths(page)).toEqual(before);
		const leaked = await page.evaluate(async (marker) => {
			for (const name of await caches.keys()) {
				const cache = await caches.open(name);
				for (const req of await cache.keys()) {
					const res = await cache.match(req);
					if (res && (await res.text()).includes(marker)) return true;
				}
			}
			return false;
		}, MARKER);
		expect(leaked).toBe(false);
	});
});
