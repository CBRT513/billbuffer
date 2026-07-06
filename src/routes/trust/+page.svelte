<script lang="ts">
	// Static trust page: no state, no props, no browser APIs — content only, so it
	// prerenders to plain HTML and needs no JavaScript to read.
	const FEEDBACK = 'feedback@billbuffer.app';
</script>

<svelte:head>
	<title>Trust — BillBuffer</title>
	<meta
		name="description"
		content="How BillBuffer keeps your money your business: on-device only, no bank link, no accounts, no analytics."
	/>
</svelte:head>

<main class="trust" data-testid="trust">
	<div class="inner">
		<a class="brand" href="/" aria-label="BillBuffer home">
			<svg class="mark" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
				<rect width="64" height="64" rx="14" fill="#4f7d78" />
				<path
					d="M20 17h15a9 9 0 0 1 0 18H20zM20 29h17a9 9 0 0 1 0 18H20z"
					fill="none"
					stroke="#ffffff"
					stroke-width="4"
					stroke-linejoin="round"
				/>
			</svg>
			<span class="wordmark">BillBuffer</span>
		</a>

		<h1>Why you can trust BillBuffer</h1>
		<p class="lead">
			BillBuffer is built so your money stays your business. Here is exactly how it works.
		</p>

		<ul class="points" data-testid="trust-points">
			<li>
				<h2>Everything stays on your device</h2>
				<p>
					Your paycheck and bills are saved only here, in this device's storage. Nothing is
					uploaded.
				</p>
			</li>
			<li>
				<h2>It never connects to your bank</h2>
				<p>
					There is no bank login and no bank link anywhere in BillBuffer. It never touches your
					accounts.
				</p>
			</li>
			<li>
				<h2>There are no accounts</h2>
				<p>You don't create an account or sign in. BillBuffer has no idea who you are.</p>
			</li>
			<li>
				<h2>There is no analytics</h2>
				<p>
					Nothing you tap or type is measured, counted, or reported. There are no trackers of any
					kind.
				</p>
			</li>
			<li>
				<h2>BillBuffer can't see your paycheck or bills</h2>
				<p>
					Your numbers stay on your device and are never sent anywhere, so no one at BillBuffer can
					see them.
				</p>
			</li>
			<li>
				<h2>You control export and import</h2>
				<p>
					Export and Import are yours alone. You can export your data to a file, or import it back,
					whenever you choose — and only you can do it.
				</p>
			</li>
			<li>
				<h2>Email is the only thing we ever receive</h2>
				<p>
					If you choose to email feedback, that message is the only information BillBuffer ever
					receives. Nothing else leaves your device.
				</p>
			</li>
		</ul>

		<p class="cta"><a href="/">Open BillBuffer</a></p>

		<footer>
			<p class="made">Made by Equilibrium Labs LLC</p>
			<p class="contact">
				Contact: <a href="mailto:{FEEDBACK}" data-testid="trust-feedback">{FEEDBACK}</a>
			</p>
		</footer>
	</div>
</main>

<style>
	/* This public page owns its own background edge-to-edge, so remove the default body
	   gutter while it is shown. Scoped to this component's lifetime. */
	:global(body) {
		margin: 0;
	}

	/* Visual Direction v1 tokens (light). Kept local to this page: the global visual
	   language does not exist yet, so the page carries the accepted values itself. */
	.trust {
		--bg: #f4f6f5;
		--surface: #ffffff;
		--ink: #223330;
		--ink2: #586a66;
		--ink3: #6a7b77;
		--brand: #4f7d78;
		--line: #e4eae8;
		--focus: #4f7d78;
		--shadow: 0 1px 2px rgba(40, 60, 55, 0.05), 0 10px 26px rgba(40, 60, 55, 0.06);

		box-sizing: border-box;
		min-height: 100dvh;
		width: 100%;
		background: var(--bg);
		color: var(--ink);
		padding: 2.25rem 1.25rem 3rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		line-height: 1.5;
	}

	@media (prefers-color-scheme: dark) {
		.trust {
			--bg: #0f1c1a;
			--surface: #182926;
			--ink: #eaf0ee;
			--ink2: #b7c6c1;
			--ink3: #9dafaa;
			--brand: #8fbdb6;
			--line: rgba(255, 255, 255, 0.14);
			--focus: #9ad3cb;
			--shadow: 0 1px 2px rgba(0, 0, 0, 0.45), 0 6px 18px rgba(0, 0, 0, 0.35);
		}
	}

	.inner {
		max-width: 34rem;
		margin: 0 auto;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		text-decoration: none;
		color: var(--ink);
	}

	.mark {
		display: block;
		border-radius: 8px;
	}

	.wordmark {
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.3px;
	}

	h1 {
		margin: 1.5rem 0 0.4rem;
		font-size: 1.6rem;
		font-weight: 700;
		letter-spacing: -0.3px;
	}

	.lead {
		margin: 0 0 1.5rem;
		color: var(--ink2);
	}

	.points {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.9rem;
	}

	.points li {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 18px;
		box-shadow: var(--shadow);
		padding: 1rem 1.1rem;
	}

	.points h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.points p {
		margin: 0;
		color: var(--ink2);
		font-size: 0.95rem;
	}

	.cta {
		margin: 1.75rem 0 0;
	}

	.cta a {
		color: var(--brand);
		font-weight: 700;
		text-decoration: none;
	}

	footer {
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		color: var(--ink3);
		font-size: 0.85rem;
	}

	footer p {
		margin: 0.2rem 0;
	}

	footer a {
		color: var(--brand);
	}

	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
</style>
