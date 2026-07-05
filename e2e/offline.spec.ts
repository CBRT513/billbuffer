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

	test('the service worker caches only app-shell/static assets, never user data', async ({
		page
	}) => {
		await installAndControl(page);

		const cache = await page.evaluate(async () => {
			const names = await caches.keys();
			const paths: string[] = [];
			for (const name of names) {
				const c = await caches.open(name);
				for (const req of await c.keys()) paths.push(new URL(req.url).pathname);
			}
			return { names, paths };
		});

		// Only our versioned shell cache exists, and it holds the SPA entry shell.
		expect(cache.names.length).toBeGreaterThan(0);
		expect(cache.names.every((n) => n.startsWith('billbuffer-'))).toBe(true);
		expect(cache.paths).toContain('/');

		// Every cached entry is a static asset or the shell — no dynamic/user-data path.
		const looksStatic = (p: string) =>
			p === '/' ||
			p.startsWith('/_app/') ||
			/\.(js|css|svg|png|ico|json|webmanifest|woff2?|txt|html)$/.test(p);
		expect(cache.paths.filter((p) => !looksStatic(p))).toEqual([]);

		// Concretely prove the promise: user data written to IndexedDB never leaks into
		// Cache Storage (they are separate stores; the SW only ever caches static assets).
		await page.evaluate(
			() =>
				new Promise<void>((resolve, reject) => {
					const open = indexedDB.open('billbuffer', 1);
					open.onupgradeneeded = () => {
						if (!open.result.objectStoreNames.contains('appdata')) {
							open.result.createObjectStore('appdata');
						}
					};
					open.onsuccess = () => {
						const db = open.result;
						const tx = db.transaction('appdata', 'readwrite');
						tx.objectStore('appdata').put({ secret: 'USER-FINANCIAL-DATA' }, 'current');
						tx.oncomplete = () => {
							db.close();
							resolve();
						};
						tx.onerror = () => reject(tx.error);
					};
					open.onerror = () => reject(open.error);
				})
		);

		const leaked = await page.evaluate(async () => {
			for (const name of await caches.keys()) {
				const c = await caches.open(name);
				for (const req of await c.keys()) {
					const res = await c.match(req);
					if (res && (await res.text()).includes('USER-FINANCIAL-DATA')) return true;
				}
			}
			return false;
		});
		expect(leaked).toBe(false);
	});
});
