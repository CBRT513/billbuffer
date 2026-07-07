<script lang="ts">
	// Static public FAQ: no state, no props, no browser APIs — content only, so it
	// prerenders to plain HTML and needs no JavaScript. Styling matches /trust and
	// /legal/privacy so the public pages read as one set.
	const FEEDBACK = 'feedback@billbuffer.app';
</script>

<svelte:head>
	<title>FAQ — BillBuffer</title>
	<meta
		name="description"
		content="Plain-English answers about BillBuffer: no bank link, no accounts, on-device only, and what to enter first."
	/>
</svelte:head>

<main class="faq" data-testid="faq">
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

		<h1>Questions & answers</h1>
		<p class="lead">
			Plain answers to what most people ask first. For more, see the <a
				href="/trust"
				data-testid="faq-trust-link">Trust page</a
			>
			and the
			<a href="/legal/privacy" data-testid="faq-privacy-link">Privacy Policy</a>.
		</p>

		<ul class="faqs" data-testid="faq-list">
			<li>
				<h2>Do I have to connect my bank?</h2>
				<p>
					No. BillBuffer never connects to your bank. There is no bank login anywhere in it, and it
					never touches your accounts. You enter your numbers yourself.
				</p>
			</li>
			<li>
				<h2>Do I need an account or password?</h2>
				<p>
					No. There are no accounts and no passwords. You don't sign up or log in — you just open
					BillBuffer and start. It has no idea who you are.
				</p>
			</li>
			<li>
				<h2>Where is my information stored?</h2>
				<p>
					Only on this device, in your browser's storage. Your paycheck and bills stay here and are
					never uploaded anywhere.
				</p>
			</li>
			<li>
				<h2>Can BillBuffer see my paycheck or bills?</h2>
				<p>
					No. Your numbers stay on your device and are never sent anywhere, so no one at BillBuffer
					can see them.
				</p>
			</li>
			<li>
				<h2>What happens if I get a new phone or clear browser data?</h2>
				<p>
					Because your data lives only on this device, clearing your browser data, uninstalling, or
					switching phones will lose it. To keep it, use Export to save a backup file, then Import
					that file on the other device.
				</p>
			</li>
			<li>
				<h2>Can I use it on both phone and computer?</h2>
				<p>
					Yes, but each device keeps its own separate copy — there is no syncing. To move your data,
					Export a backup on one device and Import it on the other.
				</p>
			</li>
			<li>
				<h2>Is it free during the early-reviewer period?</h2>
				<p>Yes. BillBuffer is free while you are an early reviewer.</p>
			</li>
			<li>
				<h2>How do I send feedback?</h2>
				<p>
					Email <a href="mailto:{FEEDBACK}" data-testid="faq-feedback">{FEEDBACK}</a>. That message
					is the only thing BillBuffer ever receives — nothing else leaves your device.
				</p>
			</li>
			<li>
				<h2>What should I enter first?</h2>
				<p>
					Your paycheck — how much you get paid and when. Then add your bills. Once you have a
					paycheck and at least one bill, BillBuffer shows what's for bills and what's yours.
				</p>
			</li>
			<li>
				<h2>Do I need to enter every purchase I make?</h2>
				<p>
					No. BillBuffer does not track everyday spending. You enter your bills — the things you owe
					on a schedule. Whatever is left after bills is yours to spend.
				</p>
			</li>
		</ul>

		<p class="cta"><a href="/">Open BillBuffer</a></p>

		<footer>
			<!--
				TODO:
				Replace this placeholder after the future parent-company identity has completed naming and trademark review.
			-->
			<p class="contact">
				Contact: <a href="mailto:{FEEDBACK}" data-testid="faq-feedback-contact">{FEEDBACK}</a>
			</p>
			<p class="meta">
				<a href="/trust">Trust</a> · <a href="/legal/privacy">Privacy Policy</a>
			</p>
		</footer>
	</div>
</main>

<style>
	/* Visual Direction v1 tokens (light) — matched to /trust and /legal/privacy so the
	   public pages read as one set. Kept local: the global visual language does not exist
	   yet. The full-bleed background reaches the viewport edges via the app-level body
	   reset (src/app.css); this component does not touch <body>. */
	.faq {
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
		.faq {
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

	.faqs {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.9rem;
	}

	.faqs li {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 18px;
		box-shadow: var(--shadow);
		padding: 1rem 1.1rem;
	}

	.faqs h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.faqs p {
		margin: 0;
		color: var(--ink2);
		font-size: 0.95rem;
	}

	.faqs a {
		color: var(--brand);
		font-weight: 600;
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
