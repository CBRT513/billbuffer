// Integer-cent money. Invariant of the calculation layer: dollars are converted to
// integer cents at the boundary and ALL arithmetic stays in integer cents — there is
// no floating-point money math inside the engine. Cents are converted back to whole
// dollars only for display.

/** Dollars (possibly fractional, e.g. 772.5) → integer cents. Boundary use only. */
export function toCents(dollars: number): number {
	if (!Number.isFinite(dollars)) throw new Error('toCents: amount must be finite');
	return Math.round(dollars * 100);
}

/**
 * Integer ceiling division. Numerator is clamped at 0 (a non-positive requirement
 * needs no transfer); denominator must be positive.
 */
export function ceilDiv(numerator: number, denominator: number): number {
	if (denominator <= 0) throw new Error('ceilDiv: denominator must be positive');
	if (numerator <= 0) return 0;
	return Math.floor((numerator + denominator - 1) / denominator);
}

/** Round a cent amount UP to whole dollars (e.g. 66313 → 66400). */
export function roundUpToDollarCents(cents: number): number {
	return Math.ceil(cents / 100) * 100;
}

/** Round a cent amount DOWN to whole dollars (e.g. 83687 → 83600). */
export function roundDownToDollarCents(cents: number): number {
	return Math.floor(cents / 100) * 100;
}

/** Whole dollars from a cent amount, rounding UP (for "into bills" / catch-up). */
export function dollarsUp(cents: number): number {
	return Math.ceil(cents / 100);
}

/** Whole dollars from a cent amount, rounding DOWN (for "yours"). */
export function dollarsDown(cents: number): number {
	return Math.floor(cents / 100);
}
