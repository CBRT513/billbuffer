<script lang="ts">
	// Static public privacy policy: no state, no props, no browser APIs — content only,
	// so it prerenders to plain HTML and needs no JavaScript. Styling matches /trust.
	const PRIVACY = 'privacy@billbuffer.app';
	const FEEDBACK = 'feedback@billbuffer.app';
</script>

<svelte:head>
	<title>Privacy Policy — BillBuffer</title>
	<meta
		name="description"
		content="BillBuffer's plain-English privacy policy: on-device only, no accounts, no bank links, no analytics."
	/>
</svelte:head>

<main class="policy" data-testid="policy">
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

		<h1>Privacy Policy</h1>
		<p class="lead">
			This is BillBuffer's plain-English privacy policy. For how the app behaves day to day, see the <a
				href="/trust"
				data-testid="policy-trust-link">Trust page</a
			>.
		</p>

		<ul class="sections" data-testid="policy-sections">
			<li>
				<h2>No accounts, no bank connections</h2>
				<p>
					BillBuffer has no accounts — you never sign up or log in. It does not connect to your bank
					or to any financial institution.
				</p>
			</li>
			<li>
				<h2>Your financial data stays on your device</h2>
				<p>
					The paycheck and bill amounts you enter are stored only in your browser, on your device.
					BillBuffer does not receive, transmit, or store that data anywhere else, and cannot see
					it.
				</p>
			</li>
			<li>
				<h2>No analytics or advertising</h2>
				<p>
					BillBuffer uses no analytics, no advertising, and no tracking of any kind. Nothing you do
					in the app is measured or reported.
				</p>
			</li>
			<li>
				<h2>Hosting logs</h2>
				<p>
					The host that delivers the app's files may keep routine server logs, as any website host
					does. These ordinary logs do not contain the financial data you enter — that never leaves
					your device.
				</p>
			</li>
			<li>
				<h2>Email you choose to send</h2>
				<p>
					If you email us — for feedback or a privacy question — we receive that message and its
					contents, because you sent it. We only ever receive messages you choose to send.
				</p>
			</li>
			<li>
				<h2>Backups are your files</h2>
				<p>
					When you export a backup, it is a file saved by you, to a place you choose. Importing
					reads a file you pick. BillBuffer never uploads or shares these files.
				</p>
			</li>
			<li>
				<h2>Losing device or browser data</h2>
				<p>
					Because your data lives only on your device and browser, it can be lost if you clear your
					browser data, uninstall, or lose the device. Keeping backups is your responsibility —
					BillBuffer cannot recover data it never had a copy of.
				</p>
			</li>
			<li>
				<h2>If this ever changes</h2>
				<p>
					This policy describes BillBuffer today: on-device only, no accounts, no bank links, no
					tracking. If a future version adds anything that collects, syncs, or transmits your data —
					accounts, cloud sync, or payments — this policy will change first to describe it plainly.
				</p>
			</li>
		</ul>

		<footer>
			<p class="made">Made by Equilibrium Labs LLC</p>
			<p class="contact">
				Privacy questions:
				<a href="mailto:{PRIVACY}" data-testid="policy-privacy-contact">{PRIVACY}</a>
			</p>
			<p class="contact">
				Feedback: <a href="mailto:{FEEDBACK}" data-testid="policy-feedback-contact">{FEEDBACK}</a>
			</p>
			<p class="meta">
				<a href="/trust">Trust</a> · Last updated July 2026
			</p>
		</footer>
	</div>
</main>

<style>
	/* Visual Direction v1 tokens (light) — matched to /trust so the public/legal pages
	   read as one set. Kept local: the global visual language does not exist yet. The
	   full-bleed background reaches the viewport edges via the app-level body reset
	   (src/app.css); this component does not touch <body>. */
	.policy {
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
		.policy {
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

	.lead a {
		color: var(--brand);
		font-weight: 600;
	}

	.sections {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.9rem;
	}

	.sections li {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 18px;
		box-shadow: var(--shadow);
		padding: 1rem 1.1rem;
	}

	.sections h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.sections p {
		margin: 0;
		color: var(--ink2);
		font-size: 0.95rem;
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
