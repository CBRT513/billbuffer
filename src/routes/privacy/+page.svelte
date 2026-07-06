<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppData } from '$lib/types';
	import { emptyAppData } from '$lib/types';
	import { clearAppData, loadAppData } from '$lib/storage/db';
	import { downloadBackup, importBackupText, readBackupFile } from '$lib/storage/importExport';

	// Privacy / Trust screen (brief §3 screen 6): the plain-language promise plus the
	// user's data-portability controls — Export, Import, Delete everything — wired to the
	// existing storage/import-export/validator modules. No account, no network.

	let data = $state<AppData>(emptyAppData());
	let importErrors = $state<string[]>([]);
	let status = $state('');
	let confirmingDelete = $state(false);
	let fileInput = $state<HTMLInputElement>();

	onMount(refresh);

	async function refresh() {
		data = await loadAppData();
	}

	// The impure clock boundary: the engine/validator take "today" as input; here (the
	// UI) is where the real local date is read, formatted strictly as YYYY-MM-DD.
	function localTodayIso(): string {
		const d = new Date();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}

	function onExport() {
		status = '';
		importErrors = [];
		downloadBackup(data);
	}

	async function onImportFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // let the same file be picked again later
		if (!file) return;

		status = '';
		importErrors = [];

		const text = await readBackupFile(file);
		const result = await importBackupText(text, { today: localTodayIso() });
		if (result.ok) {
			await refresh(); // only touch state on success — a failed import changes nothing
			status = 'Backup imported. Your data on this device was replaced.';
		} else {
			importErrors = [...result.errors];
		}
	}

	async function confirmDelete() {
		await clearAppData();
		await refresh();
		confirmingDelete = false;
		importErrors = [];
		status = 'Everything on this device has been deleted.';
	}
</script>

<main>
	<h1>Your privacy</h1>

	<section aria-label="Privacy promise" class="promise" data-testid="promise">
		<ul>
			<li><strong>No account.</strong> You never sign up or log in.</li>
			<li><strong>No bank connection.</strong> Nothing is ever linked to your bank.</li>
			<li><strong>No analytics.</strong> Nothing you do is tracked or sent anywhere.</li>
			<li><strong>Your data stays on this device.</strong> It never leaves.</li>
		</ul>
	</section>

	<section aria-label="Everything this app is holding" class="held" data-testid="held-data">
		<h2>Everything this app is holding</h2>
		<p data-testid="held-paycheck">Paycheck: {data.paycheck ? 'saved' : 'not set'}</p>
		<p data-testid="held-bills">Bills: {data.bills.length}</p>
	</section>

	<section aria-label="Your data controls" class="controls">
		<h2>Your data</h2>

		<button type="button" onclick={onExport}>Export backup</button>

		<button type="button" onclick={() => fileInput?.click()}>Import backup</button>
		<input
			bind:this={fileInput}
			type="file"
			accept="application/json,.json"
			onchange={onImportFile}
			data-testid="import-input"
			hidden
		/>

		{#if !confirmingDelete}
			<button type="button" class="danger" onclick={() => (confirmingDelete = true)}>
				Delete everything
			</button>
		{:else}
			<div class="confirm" data-testid="delete-confirm">
				<p>This erases your paycheck and bills from this device. It cannot be undone.</p>
				<button type="button" class="danger" onclick={confirmDelete}>Yes, delete everything</button>
				<button type="button" onclick={() => (confirmingDelete = false)}>Cancel</button>
			</div>
		{/if}
	</section>

	{#if status}
		<p role="status" class="status" data-testid="status">{status}</p>
	{/if}

	{#if importErrors.length}
		<div role="alert" class="errors" data-testid="import-errors">
			<p>That backup couldn't be imported — your current data is unchanged:</p>
			<ul>
				{#each importErrors as error}
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

	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.5rem;
	}

	section {
		margin-top: 1.75rem;
	}

	.promise ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}

	.held {
		background: #e6efef;
		border-radius: 10px;
		padding: 0.75rem 1rem;
	}

	.held p {
		margin: 0.25rem 0;
	}

	button {
		font: inherit;
		padding: 0.55rem 0.9rem;
		margin: 0.25rem 0.4rem 0.25rem 0;
		border-radius: 8px;
		border: 1px solid #4f7d78;
		background: #4f7d78;
		color: #fff;
		cursor: pointer;
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
