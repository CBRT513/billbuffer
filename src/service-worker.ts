/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Offline-first app-shell cache. Precaches the built assets AND the SPA navigation
// shell so the installed app loads and runs with zero network after the first visit
// (Promise: "works without the internet"). Caches only static app assets — never
// user data (there is none off-device; user data lives in IndexedDB).

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `billbuffer-${version}`;

// The SPA entry document. adapter-static serves this (the `index.html` fallback) for
// every navigation; without it in the cache, an offline launch at `/` would fail.
const SHELL = '/';
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll([...ASSETS, SHELL]);
	}
	event.waitUntil(addFilesToCache());
});

sw.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Immutable build/static assets: cache-first.
		if (ASSETS.includes(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		// SPA navigations (any route): network-first, falling back to the cached
		// shell when offline so the app always boots and client-routes from there.
		if (event.request.mode === 'navigate') {
			try {
				return await fetch(event.request);
			} catch {
				const shell = await cache.match(SHELL);
				if (shell) return shell;
			}
		}

		// Everything else: try the network, fall back to cache when offline.
		try {
			const response = await fetch(event.request);
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw new Error('offline and not cached');
		}
	}

	event.respondWith(respond());
});
