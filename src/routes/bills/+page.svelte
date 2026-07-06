<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppData, BillFreq } from '$lib/types';
	import { emptyAppData } from '$lib/types';
	import { loadAppData } from '$lib/storage/db';

	// Bills list (brief §3 screen 4): a read-only overview of stored bills, each linking
	// into the editor at /bill/[id], plus an entry point to /bill/new. No engine, no
	// mutation — just review + navigation.

	let data = $state<AppData>(emptyAppData());
	let loading = $state(true);

	onMount(async () => {
		data = await loadAppData();
		loading = false;
	});

	const FREQ_LABEL: Record<BillFreq, string> = {
		monthly: 'Monthly',
		quarterly: 'Every 3 months',
		annual: 'Once a year'
	};

	function money(n: number): string {
		return `$${n.toFixed(2)}`;
	}
</script>

<main>
	<div class="head">
		<h1>Your bills</h1>
		<a class="add" href="/bill/new" data-testid="add-bill">Add a bill</a>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if data.bills.length === 0}
		<div class="empty" data-testid="empty">
			<p>You haven't added any bills yet.</p>
			<a href="/bill/new">Add your first bill</a>
		</div>
	{:else}
		<ul class="bills" data-testid="bills">
			{#each data.bills as bill (bill.id)}
				<li>
					<a class="row" href="/bill/{bill.id}" data-testid="bill-row">
						<span class="name">
							{bill.name}
							{#if bill.showPayoff}
								<span class="badge" data-testid="revolving-badge">Credit card</span>
							{/if}
						</span>
						<span class="meta">
							<span class="amount">{money(bill.amount)}</span>
							<span class="freq">{FREQ_LABEL[bill.freq]}</span>
							<span class="due">Next due {bill.dueDate}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
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

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	h1 {
		font-weight: 700;
		letter-spacing: -0.3px;
	}

	.add {
		color: #4f7d78;
		font-weight: 600;
		white-space: nowrap;
	}

	.empty {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #e6efef;
		border-radius: 10px;
		text-align: center;
	}

	.empty a {
		color: #4f7d78;
		font-weight: 600;
	}

	.bills {
		list-style: none;
		padding: 0;
		margin: 1.25rem 0 0;
		display: grid;
		gap: 0.6rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border: 1px solid #cddad9;
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
	}

	.row:hover {
		border-color: #4f7d78;
		background: #f2f7f6;
	}

	.name {
		font-weight: 600;
	}

	.badge {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.05rem 0.45rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #4f7d78;
		background: #e6efef;
		border-radius: 999px;
		vertical-align: middle;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		color: #5b6b67;
		font-size: 0.95rem;
	}
</style>
