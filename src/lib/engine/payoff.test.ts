import { describe, it, expect } from 'vitest';
import { payoffMonths } from './payoff';

describe('revolving-debt amortization (TEST_MATRIX E2/E3/E4)', () => {
	it('already paid off (balance 0) → 0 months', () => {
		expect(payoffMonths(0, 24, 4500)).toBe(0);
	});

	it('pays off in finite months when the payment beats the interest', () => {
		const months = payoffMonths(40000, 24, 4500); // $400 @ 24% APR, $45/mo
		expect(months).not.toBeNull();
		expect(months as number).toBeGreaterThan(0);
		expect(months as number).toBeLessThan(24);
	});

	it('never pays off when the payment ≤ monthly interest → null', () => {
		expect(payoffMonths(100000, 24, 2000)).toBeNull(); // interest $20/mo, pay $20
		expect(payoffMonths(100000, 24, 1500)).toBeNull(); // pay below interest
	});

	it('zero APR pays off by simple division', () => {
		expect(payoffMonths(30000, 0, 10000)).toBe(3); // $300 / $100
	});
});
