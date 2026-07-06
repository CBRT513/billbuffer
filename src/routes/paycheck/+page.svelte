<script lang="ts">
	import { onMount } from 'svelte';
	import type { Frequency } from '$lib/types';
	import { loadAppData, saveAppData } from '$lib/storage/db';
	import { validateAppData } from '$lib/validation/validate';

	// Paycheck setup (brief §3 screen 2). Edits ONLY the paycheck; the whole candidate
	// AppData (form paycheck + existing bills) goes through the shared validator, so bills
	// are preserved and re-validated, and paycheck rules (amount > 0, valid + in-horizon
	// payday, cushion ≥ 0, finite balance that may be negative) are enforced before save.

	let amount = $state<number | undefined>(undefined);
	let freq = $state<Frequency>('biweekly');
	let next = $state('');
	let balance = $state<number | undefined>(0);
	let cushion = $state<number | undefined>(0);

	let loading = $state(true); // true until the first IndexedDB load resolves
	let errors = $state<string[]>([]);
	let status = $state('');

	onMount(async () => {
		const data = await loadAppData();
		if (data.paycheck) {
			amount = data.paycheck.amount;
			freq = data.paycheck.freq;
			next = data.paycheck.next;
			balance = data.paycheck.billsAccountBalanceToday;
			cushion = data.paycheck.cushion;
		}
		loading = false;
	});

	// The impure clock boundary: the validator/engine take "today" as input; here (the
	// UI) is where the real local date is read, strictly as YYYY-MM-DD.
	function localTodayIso(): string {
		const d = new Date();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = [];
		status = '';

		// Load fresh so bills + onboarded are preserved regardless of form-load timing.
		const current = await loadAppData();
		const candidate = {
			onboarded: current.onboarded,
			paycheck: { amount, freq, next, billsAccountBalanceToday: balance, cushion },
			bills: current.bills
		};

		const result = validateAppData(candidate, { today: localTodayIso() });
		if (result.ok) {
			await saveAppData(result.value);
			// Reflect the normalized, saved values back into the form.
			if (result.value.paycheck) {
				amount = result.value.paycheck.amount;
				balance = result.value.paycheck.billsAccountBalanceToday;
				cushion = result.value.paycheck.cushion;
			}
			status = 'Paycheck saved.';
		} else {
			errors = [...result.errors];
		}
	}
</script>

<main>
	<h1>Your paycheck</h1>
	<p class="lead">These numbers drive your plan. You can change them anytime.</p>

	<form onsubmit={onSubmit} novalidate>
		<div class="field">
			<label for="amount">How much is each paycheck?</label>
			<input
				id="amount"
				type="number"
				step="0.01"
				inputmode="decimal"
				bind:value={amount}
				data-testid="amount"
			/>
		</div>

		<div class="field">
			<label for="freq">How often are you paid?</label>
			<select id="freq" bind:value={freq} data-testid="freq">
				<option value="weekly">Weekly</option>
				<option value="biweekly">Every 2 weeks</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>

		<div class="field">
			<label for="next">When is your next payday?</label>
			<input id="next" type="date" bind:value={next} data-testid="next" />
		</div>

		<div class="field">
			<label for="balance">Bills-account balance today</label>
			<input
				id="balance"
				type="number"
				step="0.01"
				inputmode="decimal"
				bind:value={balance}
				data-testid="balance"
			/>
			<small>Can be negative if the account is overdrawn.</small>
		</div>

		<div class="field">
			<label for="cushion">Cushion to keep in the account</label>
			<input
				id="cushion"
				type="number"
				step="0.01"
				inputmode="decimal"
				bind:value={cushion}
				data-testid="cushion"
			/>
			<small>A floor the account should never drop below. Defaults to $0.</small>
		</div>

		<button type="submit" disabled={loading}>Save paycheck</button>
	</form>

	{#if status}
		<p role="status" class="status" data-testid="status">{status}</p>
	{/if}

	{#if errors.length}
		<div role="alert" class="errors" data-testid="errors">
			<p>Please fix the following:</p>
			<ul>
				{#each errors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
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

	.lead {
		color: #4f7d78;
	}

	.field {
		display: grid;
		gap: 0.3rem;
		margin: 1.1rem 0;
	}

	label {
		font-weight: 600;
	}

	input,
	select {
		font: inherit;
		padding: 0.5rem 0.6rem;
		border: 1px solid #b9cccb;
		border-radius: 8px;
	}

	small {
		color: #5b6b67;
	}

	button {
		font: inherit;
		padding: 0.6rem 1rem;
		margin-top: 0.5rem;
		border-radius: 8px;
		border: 1px solid #4f7d78;
		background: #4f7d78;
		color: #fff;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.status {
		margin-top: 1.25rem;
		color: #2f6b3f;
		font-weight: 600;
	}

	.errors {
		margin-top: 1.25rem;
		border: 1px solid #a3341f;
		border-radius: 10px;
		padding: 0.5rem 1rem;
		color: #7a2416;
	}
</style>
