/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Offline-first app-shell cache. Precaches the built assets, the SPA navigation shell,
// AND the prerendered public documents (e.g. /trust) so the installed app loads and runs
// with zero network after the first visit (Promise: "works without the internet").
// Caches only static app assets and prerendered HTML — never user data (there is none
// off-device; user data lives in IndexedDB).

import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `billbuffer-${version}`;

// The SPA entry document. adapter-static serves this (the `index.html` fallback) for
// every navigation; without it in the cache, an offline launch at `/` would fail.
const SHELL = '/';
const ASSETS = [...build, ...files];
// Prerendered documents (e.g. /trust) are real HTML with their own content. Offline they
// must be served as themselves — never swapped for the SPA shell.
const PRERENDERED = new Set(prerendered);

sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll([...ASSETS, SHELL, ...prerendered]);
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

		if (event.request.mode === 'navigate') {
			// A prerendered document (e.g. /trust) has its own real HTML: network-first,
			// but fall back to the EXACT cached document — never the SPA shell.
			if (PRERENDERED.has(url.pathname)) {
				try {
					return await fetch(event.request);
				} catch {
					const doc = await cache.match(url.pathname);
					if (doc) return doc;
				}
			} else {
				// SPA navigations (client-only routes): network-first, falling back to the
				// cached shell when offline so the app always boots and client-routes.
				try {
					return await fetch(event.request);
				} catch {
					const shell = await cache.match(SHELL);
					if (shell) return shell;
				}
			}
		}

		// Everything else: pass straight through to the network. We deliberately do NOT
		// runtime-cache arbitrary responses — the cache only ever holds the precached app
		// shell, prerendered documents, and static assets (handled above), so no response
		// derived from user data can ever be written into Cache Storage. Everything the app
		// needs offline is already precached, so there is nothing to runtime-cache.
		return fetch(event.request);
	}

	event.respondWith(respond());
});
