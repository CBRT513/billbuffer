// IndexedDB persistence — the ONLY browser-coupled module in the data layer.
//
// On-device only (privacy-first — docs/architecture/ARCHITECTURE_GUARDRAILS.md #4/#8):
// a single versioned record under one key. This file owns the IndexedDB plumbing;
// the versioning/normalization policy lives in ./schema.ts, and the domain model in
// $lib/types. It holds NO calculation policy — the engine never imports from here
// (enforced by src/lib/architecture.test.ts).
//
// The app runs SPA-only (ssr=false, prerender=false — src/routes/+layout.ts), so
// these functions are only ever called client-side. We gate on the presence of a
// real `indexedDB` rather than SvelteKit's `browser` flag, which keeps the layer
// framework-free and lets it run against a fake IndexedDB under test.

import type { AppData } from '$lib/types';
import type { StoredAppData } from './schema';
import { fromStored, toStored } from './schema';

const DB_NAME = 'billbuffer';
const DB_VERSION = 1;
const STORE = 'appdata';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB is not available in this environment.'));
			return;
		}
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function run<T>(
	mode: IDBTransactionMode,
	op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(STORE, mode);
				const req = op(tx.objectStore(STORE));
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
				tx.oncomplete = () => db.close();
			})
	);
}

/** Load the stored AppData, tolerating an empty/first-run or partially-populated
 *  store (brief §5). Returns a fresh empty record when nothing is stored. */
export async function loadAppData(): Promise<AppData> {
	// `fromStored` turns an absent record (first run) into the empty shape too.
	const stored = await run<StoredAppData | undefined>('readonly', (s) => s.get(KEY));
	return fromStored(stored);
}

/** Persist the full AppData as a versioned, defensively-cloned envelope. The stored
 *  record never aliases `data`, so later caller mutations cannot reach it. */
export async function saveAppData(data: AppData): Promise<void> {
	await run('readwrite', (s) => s.put(toStored(data), KEY));
}

/** Delete everything (wired to the "Delete everything" action in a later PR). */
export async function clearAppData(): Promise<void> {
	await run('readwrite', (s) => s.clear());
}

/** The schema version currently on disk, or null if there is no record. The seam
 *  future migrations use to decide whether an upgrade is needed. */
export async function peekStoredVersion(): Promise<number | null> {
	const stored = await run<StoredAppData | undefined>('readonly', (s) => s.get(KEY));
	return stored !== undefined && typeof stored.schemaVersion === 'number'
		? stored.schemaVersion
		: null;
}
