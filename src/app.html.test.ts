import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Accessibility guard (WCAG 1.4.4 — Resize Text): the app shell must never suppress
// user zoom. A viewport meta with `maximum-scale=1` or `user-scalable=no` stops users
// from pinch-zooming, which fails AA and hurts anyone who needs to enlarge a figure.
// This test fails the build if that restriction is ever reintroduced to app.html.

const APP_HTML = join(process.cwd(), 'src', 'app.html');

function viewportContent(html: string): string {
	const m = /<meta\s+name=["']viewport["']\s+content=["']([^"']*)["']/i.exec(html);
	return m ? m[1] : '';
}

describe('app.html — user zoom is not blocked', () => {
	const html = readFileSync(APP_HTML, 'utf8');
	const content = viewportContent(html);

	it('has a viewport meta (guards against a false pass if the tag is renamed/removed)', () => {
		expect(content).not.toBe('');
		expect(content).toMatch(/width=device-width/);
	});

	it('does not pin maximum-scale', () => {
		expect(content).not.toMatch(/maximum-scale/i);
	});

	it('does not disable user scaling', () => {
		expect(content).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
	});
});
