// The fixed-transfer forecast engine, built from CALCULATION_ENGINE_SPEC.md (not
// copied from the prototype). Pure and deterministic: "today" is an explicit input,
// all money is integer cents, and inputs are never mutated. Same input → same output.

import { ceilDiv, dollarsDown, dollarsUp, toCents } from './money';
import { formatIsoDate, fromOrdinal, parseIsoDate, toOrdinal, type CivilDate } from './dates';
import { generateBillOccurrences, generatePaydays, horizonEnd as horizonEndOf } from './schedule';
import { payoffMonths } from './payoff';
import type { Bill, ForecastInput, ForecastResult } from './types';

export class EngineError extends Error {}

interface FlowEvent {
	readonly ord: number;
	readonly isPay: boolean; // true = payday inflow (+X); false = bill outflow (−amount)
	readonly amountCents: number; // outflow amount; 0 for paydays
}

/** Outflow events for one bill within the horizon (revolving stop-when-paid applied). */
function billEvents(bill: Bill, today: CivilDate, end: CivilDate): FlowEvent[] {
	const amountCents = toCents(bill.amount);
	// Credit cards are monthly regardless of the stored frequency.
	const freq = bill.showPayoff ? 'monthly' : bill.freq;
	const occurrences = generateBillOccurrences(bill.dueDate, freq, today, end);

	let count = occurrences.length;
	if (bill.showPayoff && bill.stopWhenPaid) {
		const balanceCents = toCents(bill.balance);
		if (balanceCents <= 0) return []; // already paid off → no future payments
		const months = payoffMonths(balanceCents, bill.apr, amountCents);
		if (months !== null) count = Math.min(count, months); // null = never pays off → stays ongoing
	}

	const events: FlowEvent[] = [];
	for (let i = 0; i < count; i++) {
		events.push({ ord: toOrdinal(occurrences[i]), isPay: false, amountCents });
	}
	return events;
}

/** Walk the merged timeline once; return the lowest balance and its ordinal. */
function simulate(
	events: readonly FlowEvent[],
	transferCents: number,
	startCents: number,
	todayOrd: number
): { minBalCents: number; minOrd: number } {
	let balance = startCents;
	let minBal = startCents;
	let minOrd = todayOrd;
	for (const ev of events) {
		balance += ev.isPay ? transferCents : -ev.amountCents;
		if (balance < minBal) {
			minBal = balance;
			minOrd = ev.ord;
		}
	}
	return { minBalCents: minBal, minOrd };
}

/**
 * Smallest integer-cent transfer such that the lowest balance stays ≥ cushion,
 * starting from `startCents`. Returns null if even `hiCents` is infeasible.
 */
function smallestTransfer(
	events: readonly FlowEvent[],
	startCents: number,
	cushionCents: number,
	todayOrd: number,
	hiCents: number
): number | null {
	const ok = (x: number) => simulate(events, x, startCents, todayOrd).minBalCents >= cushionCents;
	if (ok(0)) return 0;
	let lo = 0;
	let hi = hiCents;
	if (!ok(hi)) return null;
	while (lo < hi) {
		const mid = Math.floor((lo + hi) / 2);
		if (ok(mid)) hi = mid;
		else lo = mid + 1;
	}
	return hi;
}

/** Catch-up (cents) that lifts the lowest point under `transferCents` to the cushion. */
function requiredCatchUp(
	events: readonly FlowEvent[],
	transferCents: number,
	startCents: number,
	cushionCents: number,
	todayOrd: number
): number {
	const low = simulate(events, transferCents, startCents, todayOrd).minBalCents;
	return Math.max(0, cushionCents - low);
}

export function forecast(input: ForecastInput, todayIso: string): ForecastResult {
	const today = parseIsoDate(todayIso);
	if (!today) throw new EngineError(`Invalid today date: ${todayIso}`);
	const todayOrd = toOrdinal(today);
	const end = horizonEndOf(today);

	const { paycheck } = input;

	// Reject invalid dates up front. A malformed/impossible date must never be
	// silently dropped: skipping a bill would understate total outflow and produce an
	// underfunded plan, and skipping the paycheck date would misreport the horizon.
	if (!parseIsoDate(paycheck.next)) {
		throw new EngineError(`Invalid paycheck next payday: ${paycheck.next}`);
	}
	for (const bill of input.bills) {
		if (!parseIsoDate(bill.dueDate)) {
			throw new EngineError(`Invalid due date for bill "${bill.name}": ${bill.dueDate}`);
		}
	}

	const payCents = toCents(paycheck.amount);
	const startCents = toCents(paycheck.billsAccountBalanceToday); // may be negative
	const cushionCents = toCents(paycheck.cushion);

	const paydays = generatePaydays(paycheck.next, paycheck.freq, today, end);
	const nPay = paydays.length;
	if (nPay === 0) {
		// The validation layer rejects this before the engine runs (a next payday
		// beyond the horizon). Guard so we never divide by zero.
		throw new EngineError('No paydays fall inside the 36-month horizon');
	}

	// Merge bill outflows + payday inflows into one chronological timeline. On a
	// same-day tie, the bill (outflow) is applied before the paycheck (inflow).
	const events: FlowEvent[] = [];
	let totalOutCents = 0;
	for (const bill of input.bills) {
		for (const ev of billEvents(bill, today, end)) {
			events.push(ev);
			totalOutCents += ev.amountCents;
		}
	}
	for (const payday of paydays) {
		events.push({ ord: toOrdinal(payday), isPay: true, amountCents: 0 });
	}
	events.sort((a, b) => a.ord - b.ord || Number(a.isPay) - Number(b.isPay));

	// A transfer this large is always feasible past the pre-first-payday gap.
	const hiCents = totalOutCents + Math.max(cushionCents, 0) + payCents + 1_000_000;

	// Step 1 — minimum-catch-up (normal) plan. catchUp0 = the pre-first-payday floor
	// top-up (= requiredCatchUpForTransfer(∞)); then the smallest transfer from there.
	const deepestInf = simulate(events, hiCents, startCents, todayOrd).minBalCents;
	const catchUp0 = Math.max(0, cushionCents - deepestInf);
	const x0 = smallestTransfer(events, startCents + catchUp0, cushionCents, todayOrd, hiCents);

	if (x0 !== null && x0 <= payCents) {
		return feasibleResult(
			events,
			x0,
			catchUp0,
			startCents + catchUp0,
			payCents,
			nPay,
			totalOutCents,
			todayOrd
		);
	}

	// Step 2 — balance-aware affordability. avg > paycheck is only a signal; the real
	// test is whether the starting balance can carry the horizon.
	const impossible = startCents + nPay * payCents < totalOutCents + cushionCents;
	if (impossible) {
		// Sustainable transfer the plan would need (balance-aware "bills need").
		const needCents = ceilDiv(totalOutCents + cushionCents - startCents, nPay);
		const shortfallCents = Math.max(0, needCents - payCents);
		return {
			impossible: true,
			recurringTransferCents: needCents,
			yoursCents: 0,
			startCatchUpCents: 0,
			shortfallPerPaycheckCents: shortfallCents,
			lowestBalanceCents: null,
			lowestDate: null,
			paychecksInHorizon: nPay,
			totalOutflowCents: totalOutCents,
			display: {
				intoBillsDollars: dollarsUp(needCents),
				yoursDollars: 0,
				startCatchUpDollars: 0,
				shortfallDollars: dollarsUp(shortfallCents)
			}
		};
	}

	// Step 3 — timing resolution. Cap the recurring transfer at the balance-aware
	// long-run sustainable amount (≤ paycheck) and let a larger catch-up bridge the
	// early gap.
	const sustainable = ceilDiv(Math.max(0, totalOutCents + cushionCents - startCents), nPay);
	const xr = Math.min(payCents, sustainable);
	const catchUpR = requiredCatchUp(events, xr, startCents, cushionCents, todayOrd);
	return feasibleResult(
		events,
		xr,
		catchUpR,
		startCents + catchUpR,
		payCents,
		nPay,
		totalOutCents,
		todayOrd
	);
}

function feasibleResult(
	events: readonly FlowEvent[],
	transferCents: number,
	catchUpCents: number,
	effectiveStartCents: number,
	payCents: number,
	nPay: number,
	totalOutCents: number,
	todayOrd: number
): ForecastResult {
	const sim = simulate(events, transferCents, effectiveStartCents, todayOrd);
	const yoursCents = payCents - transferCents;
	return {
		impossible: false,
		recurringTransferCents: transferCents,
		yoursCents,
		startCatchUpCents: catchUpCents,
		shortfallPerPaycheckCents: 0,
		lowestBalanceCents: sim.minBalCents,
		lowestDate: formatIsoDate(fromOrdinal(sim.minOrd)),
		paychecksInHorizon: nPay,
		totalOutflowCents: totalOutCents,
		display: {
			intoBillsDollars: dollarsUp(transferCents), // never underfund
			yoursDollars: dollarsDown(yoursCents), // never overstate
			startCatchUpDollars: dollarsUp(catchUpCents),
			shortfallDollars: 0
		}
	};
}

// Convenience for callers/tests that want the horizon boundary as an ISO string.
export function horizonEnd(todayIso: string): string {
	const today = parseIsoDate(todayIso);
	if (!today) throw new EngineError(`Invalid today date: ${todayIso}`);
	return formatIsoDate(horizonEndOf(today));
}
