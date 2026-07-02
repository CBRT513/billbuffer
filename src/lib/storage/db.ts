// IndexedDB storage shell.
//
// On-device only (privacy-first — see docs/vision/BILLBUFFER_CONSTITUTION.md). This
// is just the storage plumbing: a single versioned record under one key. No engine,
// no validation, no product logic — those arrive in later PRs.

import { browser } from '$app/environment';
import type { AppData } from '$lib/types';
import { emptyAppData } from '$lib/types';

const DB_NAME = 'billbuffer';
const DB_VERSION = 1;
const STORE = 'appdata';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!browser || typeof indexedDB === 'undefined') {
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

/** Load the stored AppData, or a fresh empty record on first run. */
export async function loadAppData(): Promise<AppData> {
	const value = await run<AppData | undefined>('readonly', (s) => s.get(KEY));
	return value ?? emptyAppData();
}

/** Persist the full AppData record. */
export async function saveAppData(data: AppData): Promise<void> {
	await run('readwrite', (s) => s.put(data, KEY));
}

/** Delete everything (wired to the "Delete everything" action in a later PR). */
export async function clearAppData(): Promise<void> {
	await run('readwrite', (s) => s.clear());
}
