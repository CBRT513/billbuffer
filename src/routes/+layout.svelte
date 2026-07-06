<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	// Minimal app frame shared by every route. The brand is a LINK (not a heading), so
	// each page keeps its own single <h1>. Each page renders its own <main>.
	let { children }: { children: Snippet } = $props();

	// Public content pages (e.g. /trust) stand on their own — no app chrome — so a
	// first-time visitor sees only the page, not the app's internal navigation.
	const showAppChrome = $derived(!page.url.pathname.startsWith('/trust'));
</script>

{#if showAppChrome}
	<header class="app-header">
		<a class="brand" href="/">BillBuffer</a>
		<nav>
			<a href="/paycheck">Paycheck</a>
			<a href="/bills">Bills</a>
			<a href="/bill/new">Add a bill</a>
			<a href="/privacy">Privacy &amp; your data</a>
		</nav>
	</header>
{/if}

{@render children()}

<style>
	.app-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		max-width: 32rem;
		margin: 1.5rem auto 0;
		padding: 0 1rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.brand {
		font-weight: 700;
		letter-spacing: -0.3px;
		color: #2b3a36;
		text-decoration: none;
	}

	nav {
		display: flex;
		gap: 0.9rem;
	}

	nav a {
		color: #4f7d78;
		font-size: 0.95rem;
	}
</style>
