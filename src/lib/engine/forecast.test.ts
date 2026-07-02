import { describe, it, expect } from 'vitest';
import { forecast, EngineError } from './forecast';
import type { Bill, ForecastInput } from './types';

function bill(p: Partial<Bill> & Pick<Bill, 'name' | 'amount' | 'dueDate'>): Bill {
	return {
		id: p.id ?? p.name,
		name: p.name,
		amount: p.amount,
		dueDate: p.dueDate,
		freq: p.freq ?? 'monthly',
		showPayoff: p.showPayoff ?? false,
		balance: p.balance ?? 0,
		apr: p.apr ?? 0,
		stopWhenPaid: p.stopWhenPaid ?? false
	};
}

const TODAY = '2030-01-01';

// TEST_MATRIX §13 Fixture A — the regression anchor.
function fixtureA(): ForecastInput {
	return {
		paycheck: {
			amount: 1500,
			freq: 'biweekly',
			next: '2030-01-04',
			billsAccountBalanceToday: 0,
			cushion: 0
		},
		bills: [
			bill({
				name: 'Card A',
				amount: 45,
				dueDate: '2030-01-02',
				showPayoff: true,
				balance: 400,
				apr: 24
			}),
			bill({ name: 'Electricity', amount: 90, dueDate: '2030-01-15' }),
			bill({ name: 'Phone Plan', amount: 70, dueDate: '2030-01-20' }),
			bill({ name: 'Apartment', amount: 900, dueDate: '2030-01-25' }),
			bill({ name: 'Auto Loan', amount: 250, dueDate: '2030-02-10' }),
			bill({ name: 'Water', amount: 60, dueDate: '2030-02-05', freq: 'quarterly' }),
			bill({ name: 'Registration', amount: 120, dueDate: '2030-03-01', freq: 'annual' })
		]
	};
}

// TEST_MATRIX D5 — weekly $100, one $1,000 annual bill after two paychecks.
function d5(balanceDollars = 0): ForecastInput {
	return {
		paycheck: {
			amount: 100,
			freq: 'weekly',
			next: '2030-01-08',
			billsAccountBalanceToday: balanceDollars,
			cushion: 0
		},
		bills: [bill({ name: 'Annual bill', amount: 1000, dueDate: '2030-01-20', freq: 'annual' })]
	};
}

// TEST_MATRIX D1/D7 — monthly $1,000, one $1,300/mo bill.
function bigMonthly(balanceDollars: number): ForecastInput {
	return {
		paycheck: {
			amount: 1000,
			freq: 'monthly',
			next: '2030-01-15',
			billsAccountBalanceToday: balanceDollars,
			cushion: 0
		},
		bills: [bill({ name: 'Big monthly bill', amount: 1300, dueDate: '2030-01-20' })]
	};
}

describe('Fixture A — regression anchor (TEST_MATRIX A1/§13)', () => {
	const r = forecast(fixtureA(), TODAY);
	it('is feasible with the documented split, catch-up, and low point', () => {
		expect(r.impossible).toBe(false);
		expect(r.paychecksInHorizon).toBe(79);
		expect(r.recurringTransferCents).toBe(66313); // $663.13
		expect(r.startCatchUpCents).toBe(4500); // $45 (Card A before first payday)
		expect(r.yoursCents).toBe(83687); // $836.87
		expect(r.lowestBalanceCents).toBe(0);
		expect(r.lowestDate).toBe('2030-01-02');
	});
	it('displays with directional rounding: bills up, yours down, catch-up up', () => {
		expect(r.display.intoBillsDollars).toBe(664); // 663.13 → up
		expect(r.display.yoursDollars).toBe(836); // 836.87 → down
		expect(r.display.startCatchUpDollars).toBe(45);
		expect(r.display.intoBillsDollars + r.display.yoursDollars).toBe(1500);
	});
});

describe('plan states (TEST_MATRIX A2/A3, D1/D2/D4/D5/D5b/D7)', () => {
	it('A2 zero bills → transfer 0, all of the paycheck is yours', () => {
		const r = forecast({ paycheck: fixtureA().paycheck, bills: [] }, TODAY);
		expect(r.recurringTransferCents).toBe(0);
		expect(r.yoursCents).toBe(150000);
		expect(r.startCatchUpCents).toBe(0);
		expect(r.display.intoBillsDollars).toBe(0);
	});

	it('A3 exact-dollar plan → no phantom cent', () => {
		const r = forecast(
			{
				paycheck: {
					amount: 1000,
					freq: 'monthly',
					next: '2030-01-15',
					billsAccountBalanceToday: 0,
					cushion: 0
				},
				bills: [bill({ name: 'Rent', amount: 500, dueDate: '2030-01-20' })]
			},
			TODAY
		);
		expect(r.recurringTransferCents).toBe(50000); // exactly $500, no +$0.01
		expect(r.startCatchUpCents).toBe(0);
		expect(r.display.intoBillsDollars).toBe(500);
	});

	it('D2 same-day ordering: a bill on payday #1 is applied before the paycheck', () => {
		const r = forecast(
			{
				paycheck: {
					amount: 100,
					freq: 'weekly',
					next: '2030-01-08',
					billsAccountBalanceToday: 0,
					cushion: 0
				},
				bills: [bill({ name: 'Same-day', amount: 50, dueDate: '2030-01-08' })]
			},
			TODAY
		);
		// If the paycheck came first it would cover the bill and need no catch-up.
		expect(r.startCatchUpCents).toBe(5000); // $50 must already be there
	});

	it('D4 existing balance covers the pre-payday bill → no catch-up', () => {
		const input = fixtureA();
		const r = forecast(
			{ ...input, paycheck: { ...input.paycheck, billsAccountBalanceToday: 100 } },
			TODAY
		);
		expect(r.startCatchUpCents).toBe(0); // $100 covers Card A's $45
	});

	it('D5 timing case: feasible, balance-aware transfer + startup catch-up', () => {
		const r = forecast(d5(0), TODAY);
		expect(r.impossible).toBe(false);
		expect(r.paychecksInHorizon).toBe(156);
		expect(r.recurringTransferCents).toBe(1924); // $19.24
		expect(r.startCatchUpCents).toBe(96152); // $961.52
		expect(r.lowestBalanceCents).toBe(0);
		expect(r.lowestDate).toBe('2030-01-20');
		expect(r.display.intoBillsDollars).toBe(20);
		expect(r.display.startCatchUpDollars).toBe(962);
	});

	it('D5b: a starting balance lowers the transfer', () => {
		const r = forecast(d5(500), TODAY);
		expect(r.impossible).toBe(false);
		expect(r.recurringTransferCents).toBe(1603); // $16.03 < $19.24
		expect(r.startCatchUpCents).toBe(80082); // $800.82
		expect(r.recurringTransferCents).toBeLessThan(forecast(d5(0), TODAY).recurringTransferCents);
	});

	it('D7 prefunded: NOT impossible even though avg > paycheck', () => {
		const r = forecast(bigMonthly(20000), TODAY);
		expect(r.impossible).toBe(false);
		expect(r.paychecksInHorizon).toBe(36);
		expect(r.recurringTransferCents).toBe(74445); // $744.45 ≤ paycheck
		expect(r.yoursCents).toBe(25555); // ~$255
	});

	it('D1 genuine income shortfall → impossible (balance-aware)', () => {
		const r = forecast(bigMonthly(0), TODAY);
		expect(r.impossible).toBe(true);
		expect(r.recurringTransferCents).toBe(130000); // $1,300 sustainable need
		expect(r.shortfallPerPaycheckCents).toBe(30000); // $300 short
		expect(r.yoursCents).toBe(0);
		expect(r.lowestBalanceCents).toBeNull();
		expect(r.display.intoBillsDollars).toBe(1300);
		expect(r.display.shortfallDollars).toBe(300);
	});
});

describe('purity guarantees (constraints)', () => {
	it('is idempotent: 100 identical runs produce byte-for-byte identical output', () => {
		const first = JSON.stringify(forecast(fixtureA(), TODAY));
		for (let i = 0; i < 100; i++) {
			expect(JSON.stringify(forecast(fixtureA(), TODAY))).toBe(first);
		}
	});

	it('does not mutate its inputs', () => {
		const input = fixtureA();
		const snapshot = structuredClone(input);
		forecast(input, TODAY);
		expect(input).toEqual(snapshot);
	});

	it('rejects a horizon with no paydays instead of dividing by zero', () => {
		const input = fixtureA();
		expect(() =>
			forecast({ ...input, paycheck: { ...input.paycheck, next: '2033-06-01' } }, TODAY)
		).toThrow(EngineError);
	});
});
