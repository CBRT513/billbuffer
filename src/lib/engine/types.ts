// Domain model for the calculation engine, built from
// docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md and CALCULATION_ENGINE_SPEC.md.
// Amounts are in dollars at this (input) boundary; the engine converts to integer
// cents immediately. These types are pure data — no methods, no framework imports.

export type Frequency = 'weekly' | 'biweekly' | 'monthly'; // paycheck
export type BillFreq = 'monthly' | 'quarterly' | 'annual'; // bill

export interface Paycheck {
	/** Dollars, > 0. */
	amount: number;
	freq: Frequency;
	/** "YYYY-MM-DD", strictly valid, ≥ 1 payday inside the 36-month horizon. */
	next: string;
	/** Actual current balance of the bills account. Dollars; MAY be negative. */
	billsAccountBalanceToday: number;
	/** Floor the account must never drop below. Dollars, ≥ 0. */
	cushion: number;
}

export interface Bill {
	id: string;
	name: string;
	/** Dollars, > 0. The minimum payment when revolving. */
	amount: number;
	/** "YYYY-MM-DD", strictly valid; the next occurrence. */
	dueDate: string;
	freq: BillFreq;
	/** Credit card / revolving debt (forced monthly in the forecast). */
	showPayoff: boolean;
	/** Dollars, ≥ 0. Amount owed on the card (0 = already paid off). */
	balance: number;
	/** Annual percentage rate, ≥ 0. */
	apr: number;
	/** Opt-in: drop this bill from the forecast after its payoff month. */
	stopWhenPaid: boolean;
}

/** Input to the forecast. `bills` and `paycheck` are never mutated by the engine. */
export interface ForecastInput {
	readonly paycheck: Paycheck;
	readonly bills: readonly Bill[];
}

/** Result of a forecast. All money is integer cents; `display` is whole dollars. */
export interface ForecastResult {
	/** True only when no recurring transfer ≤ paycheck is feasible (balance-aware). */
	readonly impossible: boolean;
	/**
	 * Feasible: the recurring per-paycheck transfer (cents).
	 * Impossible: the balance-aware sustainable transfer the plan would require (cents).
	 */
	readonly recurringTransferCents: number;
	/** Feasible: paycheck − transfer (cents). Impossible: 0. */
	readonly yoursCents: number;
	/** One-time startup catch-up (cents). Impossible: 0. */
	readonly startCatchUpCents: number;
	/** Impossible only: transfer − paycheck (cents). Feasible: 0. */
	readonly shortfallPerPaycheckCents: number;
	/** Feasible only: lowest projected balance (cents) and when it occurs. */
	readonly lowestBalanceCents: number | null;
	readonly lowestDate: string | null;
	/** Context. */
	readonly paychecksInHorizon: number;
	readonly totalOutflowCents: number;
	/** Whole-dollar values for display, directionally rounded. */
	readonly display: {
		/** "Put into bills" — rounded UP (never underfund). */
		readonly intoBillsDollars: number;
		/** "Yours" — rounded DOWN (never overstate). Impossible: 0. */
		readonly yoursDollars: number;
		/** Startup catch-up — rounded UP. */
		readonly startCatchUpDollars: number;
		/** Impossible only: "short by" per paycheck — rounded UP. */
		readonly shortfallDollars: number;
	};
}
