import { describe, it, expect } from 'vitest';
import { emptyAppData, SCHEMA_VERSION } from './types';

// Scaffold smoke test: proves the toolchain (vitest + TS) runs and the app-data
// shell is coherent. No product logic under test yet.
describe('app-data shell', () => {
	it('emptyAppData carries the current schema version', () => {
		expect(emptyAppData()).toEqual({ schemaVersion: SCHEMA_VERSION });
	});

	it('schema version is a positive integer', () => {
		expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
		expect(SCHEMA_VERSION).toBeGreaterThan(0);
	});
});
