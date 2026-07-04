import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Architecture guard: the pure layer — the domain model AND the calculation engine
// (src/lib/engine/) — must stay free of IndexedDB/browser coupling. The engine is a
// pure, framework-free compute layer (CALCULATION_ENGINE_SPEC.md; brief §8 phase 3),
// so persistence and browser APIs belong ONLY under src/lib/storage/. This test
// fails the build if that inverts (e.g. the engine ever imports the storage layer).
//
// Scope: every non-test `.ts` under src/lib EXCEPT src/lib/storage/ (the sanctioned
// home for IndexedDB) and this test itself.

const LIB_DIR = join(process.cwd(), 'src', 'lib');
const STORAGE_DIR = join(LIB_DIR, 'storage');

function tsSourcesOutsideStorage(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (full === STORAGE_DIR) continue; // storage is the only browser-coupled area
			out.push(...tsSourcesOutsideStorage(full));
			continue;
		}
		if (!entry.name.endsWith('.ts')) continue;
		if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;
		out.push(full);
	}
	return out;
}

// Strip comments so prose that merely NAMES these APIs (like this file, or the
// doc-comments in types.ts/the engine) does not trip the scan — only real
// imports/usage should.
function stripComments(src: string): string {
	return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function importSpecifiers(code: string): string[] {
	const specs: string[] = [];
	const re = /\bimport\b[^'"]*?['"]([^'"]+)['"]|\bfrom\s+['"]([^'"]+)['"]/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(code)) !== null) {
		specs.push(m[1] ?? m[2]);
	}
	return specs;
}

const FORBIDDEN_IMPORTS: RegExp[] = [
	/^\$app\//, // SvelteKit browser/runtime modules (e.g. $app/environment)
	/(^|\/)storage(\/|$)/, // the persistence layer
	/^fake-indexeddb/,
	/^idb($|\/)/
];

const FORBIDDEN_TOKENS: RegExp[] = [
	/\bindexedDB\b/,
	/\bIDB[A-Za-z]*\b/, // IDBDatabase, IDBObjectStore, IDBRequest, …
	/\blocalStorage\b/,
	/\bsessionStorage\b/
];

describe('architecture — engine/domain purity', () => {
	const files = tsSourcesOutsideStorage(LIB_DIR);

	it('scans the domain model and the engine (guards against an empty/false-pass sweep)', () => {
		const names = files.map((f) => relative(LIB_DIR, f));
		expect(names).toContain('types.ts');
		expect(names).toContain(join('engine', 'types.ts'));
	});

	it.each(files.map((f) => [relative(process.cwd(), f), f] as const))(
		'%s imports no persistence/browser module',
		(_label, file) => {
			const code = stripComments(readFileSync(file, 'utf8'));
			const offending = importSpecifiers(code).filter((spec) =>
				FORBIDDEN_IMPORTS.some((re) => re.test(spec))
			);
			expect(offending).toEqual([]);
		}
	);

	it.each(files.map((f) => [relative(process.cwd(), f), f] as const))(
		'%s references no IndexedDB/web-storage global',
		(_label, file) => {
			const code = stripComments(readFileSync(file, 'utf8'));
			const hits = FORBIDDEN_TOKENS.filter((re) => re.test(code)).map((re) => re.source);
			expect(hits).toEqual([]);
		}
	);
});
