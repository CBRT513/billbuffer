import { describe, it, expect } from 'vitest';
import { emptyAppData } from './types';
import type { AppData, Bill, Paycheck } from './types';

// Domain-model coherence. These assert the SHAPE the storage layer relies on; the
// field-level VALUE rules (finite, > 0, valid dates) belong to the validation layer
// (a later PR). Paycheck/Bill are re-exported from the engine — this file also proves
// that single-source-of-truth wiring compiles.
describe('domain model', () => {
	it('emptyAppData is a fresh, un-onboarded record with no paycheck or bills', () => {
		expect(emptyAppData()).toEqual({ onboarded: false, paycheck: null, bills: [] });
	});

	it('emptyAppData returns an independent value each call (no shared references)', () => {
		const a = emptyAppData();
		const b = emptyAppData();
		a.bills.push({} as Bill);
		a.onboarded = true;
		expect(b.bills).toEqual([]);
		expect(b.onboarded).toBe(false);
	});

	it('AppData composes the engine Paycheck/Bill primitives (spec §4 fields)', () => {
		// A compile-time contract check: this fails `svelte-check` if a field is
		// renamed or dropped. `cushion` is the sole setting and lives on Paycheck.
		const paycheck: Paycheck = {
			amount: 1500,
			freq: 'biweekly',
			next: '2030-01-04',
			billsAccountBalanceToday: -100, // may be negative (overdrawn)
			cushion: 0
		};
		const bill: Bill = {
			id: 'card-a',
			name: 'Card A',
			amount: 45,
			dueDate: '2030-01-02',
			freq: 'monthly',
			showPayoff: true,
			balance: 400,
			apr: 24,
			stopWhenPaid: false
		};
		const data: AppData = { onboarded: true, paycheck, bills: [bill] };
		expect(data.paycheck?.cushion).toBe(0);
		expect(data.bills[0].showPayoff).toBe(true);
	});
});
