<script lang="ts">
	import { onMount } from 'svelte';
	import type { BillFreq } from '$lib/types';
	import { loadAppData, saveAppData } from '$lib/storage/db';
	import { validateAppData } from '$lib/validation/validate';

	// Add / edit / delete one bill (brief §3 screen 5). Edits ONLY this bill; the whole
	// candidate AppData (paycheck + all bills) runs through the shared validator before
	// saving, so the paycheck and every other bill are preserved and re-validated in one
	// place. Revolving-debt rules (forced-monthly, balance/APR ≥ 0, stop-when-paid needs a
	// balance) are enforced by the validator.

	let { billId }: { billId: string | null } = $props();
	const editing = $derived(billId !== null);

	let name = $state('');
	let amount = $state<number | undefined>(undefined);
	let dueDate = $state('');
	let freq = $state<BillFreq | ''>(''); // '' placeholder forces an explicit choice
	let showPayoff = $state(false);
	let balance = $state<number | undefined>(undefined);
	let apr = $state<number | undefined>(undefined);
	let stopWhenPaid = $state(false);

	let loading = $state(true);
	let notFound = $state(false);
	let deleted = $state(false);
	let confirmingDelete = $state(false);
	let errors = $state<string[]>([]);
	let status = $state('');

	onMount(async () => {
		if (editing) {
			const data = await loadAppData();
			const bill = data.bills.find((b) => b.id === billId);
			if (!bill) {
				notFound = true;
			} else {
				name = bill.name;
				amount = bill.amount;
				dueDate = bill.dueDate;
				freq = bill.freq;
				showPayoff = bill.showPayoff;
				balance = bill.showPayoff ? bill.balance : undefined;
				apr = bill.showPayoff ? bill.apr : undefined;
				stopWhenPaid = bill.stopWhenPaid;
			}
		}
		loading = false;
	});

	function localTodayIso(): string {
		const d = new Date();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}

	function currentBill() {
		return {
			id: editing ? billId : crypto.randomUUID(),
			name,
			amount,
			dueDate,
			// Credit cards are monthly; the picker is locked in the UI (§8).
			freq: showPayoff ? 'monthly' : freq,
			showPayoff,
			// Debt fields only apply to revolving bills; a blank balance stays blank so the
			// stop-when-paid rule can reject it.
			balance: showPayoff ? balance : 0,
			apr: showPayoff ? apr : 0,
			stopWhenPaid: showPayoff ? stopWhenPaid : false
		};
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = [];
		status = '';

		const current = await loadAppData();
		const bill = currentBill();
		const bills = editing
			? current.bills.map((b) => (b.id === billId ? bill : b))
			: [...current.bills, bill];

		const result = validateAppData(
			{ onboarded: current.onboarded, paycheck: current.paycheck, bills },
			{ today: localTodayIso() }
		);
		if (result.ok) {
			await saveAppData(result.value);
			status = editing ? 'Bill saved.' : 'Bill added.';
			if (!editing) resetForm();
		} else {
			errors = [...result.errors];
		}
	}

	async function confirmDelete() {
		// Delete cannot invalidate the remaining data (fewer bills), so it is saved
		// directly — the paycheck and other bills are preserved untouched.
		const current = await loadAppData();
		await saveAppData({
			onboarded: current.onboarded,
			paycheck: current.paycheck,
			bills: current.bills.filter((b) => b.id !== billId)
		});
		confirmingDelete = false;
		deleted = true;
		status = 'Bill deleted.';
	}

	function resetForm() {
		name = '';
		amount = undefined;
		dueDate = '';
		freq = '';
		showPayoff = false;
		balance = undefined;
		apr = undefined;
		stopWhenPaid = false;
	}
</script>

<main>
	<h1>{editing ? 'Edit bill' : 'Add a bill'}</h1>

	{#if notFound}
		<p role="alert" data-testid="not-found">That bill wasn't found.</p>
	{:else if deleted}
		<p role="status" class="status" data-testid="status">Bill deleted.</p>
	{:else}
		<form onsubmit={onSubmit} novalidate>
			<div class="field">
				<label for="name">Name</label>
				<input id="name" type="text" bind:value={name} data-testid="name" />
			</div>

			<div class="field">
				<label for="amount">Amount</label>
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
				<label for="due">Next due date</label>
				<input id="due" type="date" bind:value={dueDate} data-testid="due" />
			</div>

			<div class="field">
				<label for="freq">Frequency</label>
				<select id="freq" bind:value={freq} disabled={showPayoff} data-testid="freq">
					<option value="">Choose…</option>
					<option value="monthly">Monthly</option>
					<option value="quarterly">Every 3 months</option>
					<option value="annual">Once a year</option>
				</select>
				{#if showPayoff}
					<small>Credit cards are billed monthly.</small>
				{/if}
			</div>

			<fieldset class="revolving">
				<label class="check">
					<input type="checkbox" bind:checked={showPayoff} data-testid="showPayoff" />
					This is a credit card or revolving debt
				</label>

				{#if showPayoff}
					<div class="field">
						<label for="balance">Balance owed</label>
						<input
							id="balance"
							type="number"
							step="0.01"
							inputmode="decimal"
							bind:value={balance}
							data-testid="balance"
						/>
						<small>Use 0 if it's already paid off.</small>
					</div>

					<div class="field">
						<label for="apr">APR (%)</label>
						<input
							id="apr"
							type="number"
							step="0.01"
							inputmode="decimal"
							bind:value={apr}
							data-testid="apr"
						/>
					</div>

					<label class="check">
						<input type="checkbox" bind:checked={stopWhenPaid} data-testid="stopWhenPaid" />
						Stop counting this once it's paid off
					</label>
				{/if}
			</fieldset>

			<button type="submit" disabled={loading}>{editing ? 'Save bill' : 'Add bill'}</button>
		</form>

		{#if editing}
			{#if !confirmingDelete}
				<button
					type="button"
					class="danger"
					data-testid="delete"
					onclick={() => (confirmingDelete = true)}
				>
					Delete bill
				</button>
			{:else}
				<div class="confirm" data-testid="delete-confirm">
					<p>Remove this bill? This cannot be undone.</p>
					<button type="button" class="danger" onclick={confirmDelete}>Yes, delete this bill</button
					>
					<button type="button" onclick={() => (confirmingDelete = false)}>Cancel</button>
				</div>
			{/if}
		{/if}
	{/if}

	{#if status && !deleted}
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

	.field {
		display: grid;
		gap: 0.3rem;
		margin: 1.1rem 0;
	}

	label {
		font-weight: 600;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	input[type='text'],
	input[type='number'],
	input[type='date'],
	select {
		font: inherit;
		padding: 0.5rem 0.6rem;
		border: 1px solid #b9cccb;
		border-radius: 8px;
	}

	small {
		color: #5b6b67;
	}

	.revolving {
		border: 1px solid #cddad9;
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin: 1.25rem 0;
	}

	button {
		font: inherit;
		padding: 0.6rem 1rem;
		margin: 0.5rem 0.4rem 0 0;
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

	button.danger {
		background: #fff;
		color: #a3341f;
		border-color: #a3341f;
	}

	.confirm {
		border: 1px solid #a3341f;
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin-top: 0.5rem;
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
