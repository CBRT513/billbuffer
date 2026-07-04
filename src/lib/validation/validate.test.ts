import { describe, it, expect } from 'vitest';
import { validateAppData } from './validate';
import type { ValidateOptions } from './validate';

// Harness "today" (never persisted — CALCULATION_ENGINE_SPEC.md §2). Horizon end is
// 2033-01-01, so a `next` of 2033-06-01 yields zero paydays (F13/C8).
const opts: ValidateOptions = { today: '2030-01-01' };

function validFile() {
	return {
		onboarded: true,
		paycheck: {
			amount: 1500,
			freq: 'biweekly',
			next: '2030-01-04',
			billsAccountBalanceToday: 0,
			cushion: 0
		},
		bills: [
			{
				id: 'card-a',
				name: 'Card A',
				amount: 45,
				dueDate: '2030-01-02',
				freq: 'monthly',
				showPayoff: true,
				balance: 400,
				apr: 24,
				stopWhenPaid: false
			},
			{
				id: 'rent',
				name: 'Apartment',
				amount: 900,
				dueDate: '2030-01-25',
				freq: 'monthly',
				showPayoff: false,
				balance: 0,
				apr: 0,
				stopWhenPaid: false
			}
		]
	};
}

function reject(raw: unknown, o: ValidateOptions = opts): readonly string[] {
	const r = validateAppData(raw, o);
	expect(r.ok).toBe(false);
	return r.ok === false ? r.errors : [];
}

function accept(raw: unknown, o: ValidateOptions = opts) {
	const r = validateAppData(raw, o);
	if (!r.ok) throw new Error(`expected ok, got: ${JSON.stringify(r.errors)}`);
	return r.value;
}

describe('import validation — §12 matrix (F-series)', () => {
	it('F1: a valid file validates and normalizes losslessly', () => {
		expect(accept(validFile())).toEqual({
			onboarded: true,
			paycheck: {
				amount: 1500,
				freq: 'biweekly',
				next: '2030-01-04',
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: [
				{
					id: 'card-a',
					name: 'Card A',
					amount: 45,
					dueDate: '2030-01-02',
					freq: 'monthly',
					showPayoff: true,
					balance: 400,
					apr: 24,
					stopWhenPaid: false
				},
				{
					id: 'rent',
					name: 'Apartment',
					amount: 900,
					dueDate: '2030-01-25',
					freq: 'monthly',
					showPayoff: false,
					balance: 0,
					apr: 0,
					stopWhenPaid: false
				}
			]
		});
	});

	it('F2: non-object / array / missing-bills payloads are rejected', () => {
		reject(42);
		reject('nope');
		reject(null);
		reject([1, 2, 3]);
		reject({ paycheck: null }); // no bills array
	});

	it('F3/C3/C4: NaN / Infinity / non-positive amounts are rejected', () => {
		for (const amount of [0, -5, NaN, Infinity]) {
			reject({ ...validFile(), paycheck: { ...validFile().paycheck, amount } });
		}
		const f = validFile();
		f.bills[0].amount = 0;
		reject(f);
		const f2 = validFile();
		f2.bills[1].amount = NaN;
		reject(f2);
	});

	it('F4: invalid paycheck or (non-revolving) bill frequency is rejected', () => {
		const p = validFile();
		p.paycheck.freq = 'daily';
		reject(p);
		const b = validFile();
		b.bills[1].freq = 'weekly'; // weekly is not a valid BILL frequency
		reject(b);
	});

	it('F5: impossible or malformed dates are rejected (strict round-trip parser)', () => {
		for (const d of ['2026-02-31', '2026-02-29', '2026-13-01', '2026-1-1', 'not-a-date']) {
			const f = validFile();
			f.bills[1].dueDate = d;
			reject(f);
		}
		const p = validFile();
		p.paycheck.next = '2026-02-31';
		reject(p);
	});

	it('F6/C1: negative cushion is rejected', () => {
		const f = validFile();
		f.paycheck.cushion = -5;
		reject(f);
	});

	it('F7/E6: revolving + stop-when-paid with blank/missing balance is rejected', () => {
		const blank = validFile();
		blank.bills[0].stopWhenPaid = true;
		blank.bills[0].balance = '' as unknown as number;
		expect(reject(blank).join(' ')).toContain('use 0 if already paid off');

		const missing = validFile();
		missing.bills[0].stopWhenPaid = true;
		delete (missing.bills[0] as { balance?: number }).balance;
		reject(missing);
	});

	it('F8: names trimmed, defaults applied, card coerced monthly, ids assigned', () => {
		const value = accept({
			bills: [
				{
					name: '  Water  ',
					amount: 60,
					dueDate: '2030-02-05',
					freq: 'quarterly',
					showPayoff: false
				},
				{ name: 'Card', amount: 30, dueDate: '2030-01-10', freq: 'annual', showPayoff: true }
			]
		});
		expect(value.onboarded).toBe(false); // missing → false
		expect(value.paycheck).toBeNull(); // missing → null
		expect(value.bills[0].name).toBe('Water'); // trimmed
		expect(value.bills[0].balance).toBe(0); // defaulted
		expect(value.bills[0].apr).toBe(0);
		expect(value.bills[0].id).toBeTruthy(); // assigned
		expect(value.bills[1].freq).toBe('monthly'); // card coerced from annual
		expect(value.bills[1].id).toBeTruthy();
	});

	it('F9/C7: negative bills-account balance is accepted (overdrawn), unlike cushion', () => {
		const f = validFile();
		f.paycheck.billsAccountBalanceToday = -100;
		expect(accept(f).paycheck?.billsAccountBalanceToday).toBe(-100);
	});

	it('F10: a normal bill with no balance/apr fields is accepted (→ 0)', () => {
		const value = accept({
			bills: [
				{
					id: 'x',
					name: 'Gym',
					amount: 20,
					dueDate: '2030-03-01',
					freq: 'monthly',
					showPayoff: false
				}
			]
		});
		expect(value.bills[0].balance).toBe(0);
		expect(value.bills[0].apr).toBe(0);
	});

	it('F11: a normal bill with blank ("" / null) balance/apr is accepted (→ 0)', () => {
		const value = accept({
			bills: [
				{
					id: 'x',
					name: 'Gym',
					amount: 20,
					dueDate: '2030-03-01',
					freq: 'monthly',
					showPayoff: false,
					balance: '',
					apr: null
				}
			]
		});
		expect(value.bills[0].balance).toBe(0);
		expect(value.bills[0].apr).toBe(0);
	});

	it('F12: revolving + stop-when-paid with balance 0 is accepted (already paid off)', () => {
		const value = accept({
			bills: [
				{
					id: 'c',
					name: 'Card',
					amount: 25,
					dueDate: '2030-01-10',
					freq: 'monthly',
					showPayoff: true,
					stopWhenPaid: true,
					balance: 0,
					apr: 20
				}
			]
		});
		expect(value.bills[0].balance).toBe(0);
		expect(value.bills[0].stopWhenPaid).toBe(true);
	});

	it('F13/C8: a valid next payday with zero paydays in the horizon is rejected', () => {
		const f = validFile();
		f.paycheck.next = '2033-06-01'; // strictly valid but > today + 36 months
		expect(reject(f).join(' ')).toContain('too far in the future');
	});

	it('F14: a payload containing testToday is rejected — valid OR invalid value', () => {
		expect(reject({ ...validFile(), testToday: '2030-01-01' }).join(' ')).toContain('testToday');
		expect(reject({ ...validFile(), testToday: '2026-02-31' }).join(' ')).toContain('testToday');
	});
});

describe('live-input validation — C-series specifics', () => {
	it('C2: a present paycheck with a blank/invalid next payday is rejected', () => {
		const blank = validFile();
		blank.paycheck.next = '';
		reject(blank);
		const missing = validFile();
		delete (missing.paycheck as { next?: string }).next;
		reject(missing);
	});

	it('C5: a blank or missing bill name is rejected', () => {
		const blank = validFile();
		blank.bills[1].name = '   ';
		reject(blank);
		const missing = validFile();
		delete (missing.bills[1] as { name?: string }).name;
		reject(missing);
	});

	it('C6: negative revolving balance or APR is rejected', () => {
		const negBal = validFile();
		negBal.bills[0].balance = -1;
		reject(negBal);
		const negApr = validFile();
		negApr.bills[0].apr = -1;
		reject(negApr);
	});
});

describe('accepted edge cases', () => {
	it('accepts a valid leap-year date (2028-02-29)', () => {
		const f = validFile();
		f.bills[1].dueDate = '2028-02-29';
		accept(f);
	});

	it('accepts a schedule that yields ≥ 1 payday in the horizon', () => {
		accept({
			paycheck: {
				amount: 100,
				freq: 'weekly',
				next: '2030-01-08',
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: []
		});
	});

	it('accepts a record with no paycheck (mid-onboarding)', () => {
		expect(accept({ onboarded: false, paycheck: null, bills: [] }).paycheck).toBeNull();
	});
});

describe('validator contract — visibility, determinism, purity', () => {
	it('rejects VISIBLY with a non-empty error list (never silently drops bad data)', () => {
		const r = validateAppData(
			{ ...validFile(), paycheck: { ...validFile().paycheck, amount: -1, cushion: -1 } },
			opts
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2); // both violations surfaced
	});

	it('is deterministic — same input yields identical normalized output', () => {
		expect(validateAppData(validFile(), opts)).toEqual(validateAppData(validFile(), opts));
	});

	it('does not mutate the caller input (valid or invalid)', () => {
		const good = validFile();
		const goodSnap = structuredClone(good);
		validateAppData(good, opts);
		expect(good).toEqual(goodSnap);

		const bad = {
			onboarded: true,
			paycheck: null,
			bills: [{ name: '  x  ', amount: -1, dueDate: 'nope', showPayoff: false }]
		};
		const badSnap = structuredClone(bad);
		validateAppData(bad, opts);
		expect(bad).toEqual(badSnap);
	});

	it('throws if options.today is not a strict date (caller contract, not user data)', () => {
		expect(() => validateAppData(validFile(), { today: 'nope' })).toThrow(TypeError);
	});
});
