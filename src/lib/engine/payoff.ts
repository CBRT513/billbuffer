// Revolving-debt amortization, in integer cents. Used only to decide how many
// monthly payments a "stop when paid off" card contributes to the forecast. The
// payoff estimate is informational and never changes the forecast on its own.

/**
 * Month-by-month amortization: each month accrue interest, then apply the payment.
 * Returns the number of months to reach a zero balance, or `null` when the payment
 * never reduces the balance (interest-only or less — "never pays off").
 */
export function payoffMonths(
	balanceCents: number,
	apr: number,
	paymentCents: number
): number | null {
	if (balanceCents <= 0) return 0;
	if (paymentCents <= 0) return null;

	// Monthly interest = balance × apr / 100 / 12, rounded to the cent. APR is scaled
	// to an integer (two decimals, e.g. 30.99% → 3099) so the rate never introduces
	// floating-point money drift.
	const aprScaled = Math.round(apr * 100);
	const interestOn = (balance: number): number => Math.round((balance * aprScaled) / 120000);

	// If the first month's interest already meets or exceeds the payment, it never pays off.
	if (paymentCents <= interestOn(balanceCents)) return null;

	let balance = balanceCents;
	let months = 0;
	const guard = 1200; // 100 years — a runaway backstop, never hit for real inputs
	while (balance > 0 && months < guard) {
		balance += interestOn(balance);
		balance -= Math.min(paymentCents, balance);
		months++;
	}
	return balance <= 0 ? months : null;
}
