<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppData } from '$lib/types';
	import { emptyAppData } from '$lib/types';
	import { loadAppData } from '$lib/storage/db';
	import { forecast } from '$lib/engine';
	import type { ForecastResult } from '$lib/engine';

	// Split / home (brief §3 screen 3) — the payoff screen. It reads the stored paycheck
	// + bills and renders the pure engine's forecast: what's yours vs into bills each
	// paycheck, the proportion, the lowest-balance forecast, an optional startup catch-up,
	// an adaptive "Why this amount?", and the impossible-plan state. No engine changes —
	// this only consumes it. All amounts use the engine's directional display rounding.

	let data = $state<AppData>(emptyAppData());
	let loading = $state(true);
	let result = $state<ForecastResult | null>(null);
	let engineError = $state(false);

	onMount(async () => {
		data = await loadAppData();
		compute();
		loading = false;
	});

	function localTodayIso(): string {
		const d = new Date();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}

	function compute() {
		result = null;
		engineError = false;
		// Only forecast a real plan (a paycheck AND at least one bill). Stored data is
		// already validated, but guard so a surprising edge (e.g. an out-of-horizon date)
		// never white-screens the home page.
		if (data.paycheck && data.bills.length > 0) {
			try {
				result = forecast({ paycheck: data.paycheck, bills: data.bills }, localTodayIso());
			} catch {
				engineError = true;
			}
		}
	}

	const usd0 = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
	const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	/** Whole-dollar (directionally-rounded) values from the engine. */
	function dollars(n: number): string {
		return usd0.format(n);
	}
	/** Cent-precise values (e.g. the lowest projected balance). */
	function money(cents: number): string {
		return usd2.format(cents / 100);
	}

	const MONTHS = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	/** "2030-01-02" → "Jan 2, 2030" without touching Date/timezones. */
	function formatDate(iso: string): string {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
		if (!m) return iso;
		return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
	}
</script>

<main>
	<h1>BillBuffer</h1>

	{#if loading}
		<p>Loading…</p>
	{:else if engineError}
		<p role="alert" class="notice" data-testid="engine-error">
			Something looks off with your saved numbers. Open Paycheck or Bills to check them.
		</p>
	{:else if !data.paycheck}
		<div class="empty" data-testid="no-paycheck">
			<p>Start with your paycheck, and we'll show what's safe to spend.</p>
			<a class="cta" href="/paycheck">Add your paycheck</a>
		</div>
	{:else if data.bills.length === 0}
		<div class="empty" data-testid="no-bills">
			<p>Add the bills you want protected, and we'll do the math.</p>
			<a class="cta" href="/bill/new">Add a bill</a>
			<a href="/bills">See your bills</a>
		</div>
	{:else if result}
		{#if result.impossible}
			{@const r = result}
			<section class="plan" data-testid="impossible">
				<p class="lead">Over the next 3 years, your bills add up to more than your income.</p>
				<p class="row">Yours each paycheck: <strong data-testid="yours">{dollars(0)}</strong></p>
				<p class="row" data-testid="bills-need">
					Bills need <strong>{dollars(r.display.intoBillsDollars)}</strong> each paycheck
				</p>
				<p class="row" data-testid="shortfall">
					Short by <strong>{dollars(r.display.shortfallDollars)}</strong> each paycheck
				</p>
				<p class="explain">
					This isn't a mistake in your setup — even with the money already in the account, the bills
					cost more than comes in. A plan can work once a bill drops or shrinks, or income rises.
				</p>
			</section>
		{:else}
			{@const r = result}
			{@const payCents = r.recurringTransferCents + r.yoursCents}
			{@const billsPctExact = payCents > 0 ? (r.recurringTransferCents / payCents) * 100 : 0}
			{@const hasCatchUp = r.display.startCatchUpDollars > 0}
			{@const suffix = hasCatchUp ? ' after setup' : ''}
			<section class="plan" data-testid="split">
				<div class="heroes">
					<div class="hero">
						<span class="label">Yours each paycheck{suffix}</span>
						<span class="value" data-testid="yours">{dollars(r.display.yoursDollars)}</span>
					</div>
					<div class="hero">
						<span class="label">Into bills each paycheck{suffix}</span>
						<span class="value" data-testid="into-bills">{dollars(r.display.intoBillsDollars)}</span
						>
					</div>
				</div>

				<div
					class="bar"
					data-testid="proportion-bar"
					role="img"
					aria-label="{dollars(r.display.intoBillsDollars)} for bills, {dollars(
						r.display.yoursDollars
					)} yours"
				>
					<span
						class="seg bills"
						data-testid="bar-bills"
						data-pct={Math.round(billsPctExact)}
						style="width: {billsPctExact}%"
					></span>
					<span class="seg yours" data-testid="bar-yours" style="width: {100 - billsPctExact}%"
					></span>
				</div>

				<div class="card" data-testid="forecast">
					<p>
						Lowest projected balance:
						<strong data-testid="lowest">{money(r.lowestBalanceCents ?? 0)}</strong>
						{#if r.lowestDate}on {formatDate(r.lowestDate)}{/if}
					</p>
					{#if hasCatchUp}
						<p class="catchup" data-testid="catchup">
							To start, get <strong>{dollars(r.display.startCatchUpDollars)}</strong> into the account
							now.
						</p>
					{/if}
				</div>

				<details class="why" data-testid="why">
					<summary>Why this amount?</summary>
					{#if hasCatchUp}
						<p>
							Each paycheck, {dollars(r.display.intoBillsDollars)} goes into bills — enough to cover every
							bill as it comes due while holding your cushion. Because some bills land before that adds
							up, a one-time {dollars(r.display.startCatchUpDollars)} gets you started. The rest each
							paycheck is yours.
						</p>
					{:else}
						<p>
							Each paycheck, {dollars(r.display.intoBillsDollars)} goes into bills — enough to cover every
							bill as it comes due while holding your cushion. The rest, {dollars(
								r.display.yoursDollars
							)}, is yours to spend.
						</p>
					{/if}
				</details>
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 32rem;
		margin: 1.5rem auto 4rem;
		padding: 0 1rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #2b3a36;
		line-height: 1.5;
	}

	h1 {
		font-weight: 700;
		letter-spacing: -0.3px;
	}

	.empty {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #e6efef;
		border-radius: 10px;
		display: grid;
		gap: 0.75rem;
		justify-items: start;
	}

	.cta,
	.empty a {
		color: #4f7d78;
		font-weight: 600;
	}

	.notice {
		margin-top: 2rem;
		padding: 1rem;
		border: 1px solid #a3341f;
		border-radius: 10px;
		color: #7a2416;
	}

	.heroes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.hero {
		display: grid;
		gap: 0.2rem;
	}

	.hero .label {
		color: #5b6b67;
		font-size: 0.9rem;
	}

	.hero .value {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.5px;
	}

	.bar {
		display: flex;
		height: 1rem;
		margin: 1.25rem 0;
		border-radius: 999px;
		overflow: hidden;
		background: #e6efef;
	}

	.seg.bills {
		background: #4f7d78;
	}

	.seg.yours {
		background: #9ec6c1;
	}

	.card {
		padding: 0.9rem 1.1rem;
		border: 1px solid #cddad9;
		border-radius: 10px;
	}

	.catchup {
		margin-top: 0.5rem;
		color: #2f6b3f;
	}

	.why {
		margin-top: 1.25rem;
	}

	.why summary {
		cursor: pointer;
		font-weight: 600;
		color: #4f7d78;
	}

	.plan .row strong,
	.explain {
		font-weight: 600;
	}

	.lead {
		color: #4f7d78;
	}
</style>
