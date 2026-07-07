import { test, expect } from '@playwright/test';

// Public /faq page: prerendered static Q&A that answers, in plain English, what a
// first-time beta neighbor asks before entering any financial information. It must read
// with no JavaScript and make no external request. Answers stay accurate to the shipped
// app — no invented features.

test.describe('FAQ page (/faq)', () => {
	test('answers the key questions in plain English, with maker + contact + links', async ({
		page
	}) => {
		await page.goto('/faq');

		await expect(
			page.getByRole('heading', { level: 1, name: 'Questions & answers' })
		).toBeVisible();

		const list = page.getByTestId('faq-list');
		await expect(list).toContainText('Do I have to connect my bank?');
		await expect(list).toContainText('Do I need an account or password?');
		await expect(list).toContainText('Where is my information stored?');
		await expect(list).toContainText('Can BillBuffer see my paycheck or bills?');
		await expect(list).toContainText('What happens if I get a new phone or clear browser data?');
		await expect(list).toContainText('Can I use it on both phone and computer?');
		await expect(list).toContainText('Is it free during the early-reviewer period?');
		await expect(list).toContainText('How do I send feedback?');
		await expect(list).toContainText('What should I enter first?');
		await expect(list).toContainText('Do I need to enter every purchase I make?');

		// A few answer specifics that must stay accurate to the shipped app.
		await expect(list).toContainText('never connects to your bank'); // no bank link
		await expect(list).toContainText('no accounts and no passwords'); // no account
		await expect(list).toContainText('Only on this device'); // on-device storage
		await expect(list).toContainText('Export'); // backup path across devices
		await expect(list).toContainText('Import');
		await expect(list).toContainText('Your paycheck'); // what to enter first

		// Standalone identity: no parent-company attribution appears on the page.
		await expect(page.getByTestId('faq')).not.toContainText('Equilibrium');

		const feedback = page.getByTestId('faq-feedback');
		await expect(feedback).toHaveText('feedback@billbuffer.app');
		await expect(feedback).toHaveAttribute('href', 'mailto:feedback@billbuffer.app');
		await expect(page.getByTestId('faq-feedback-contact')).toHaveAttribute(
			'href',
			'mailto:feedback@billbuffer.app'
		);

		await expect(page.getByTestId('faq-trust-link')).toHaveAttribute('href', '/trust');
		await expect(page.getByTestId('faq-privacy-link')).toHaveAttribute('href', '/legal/privacy');
	});

	test('is a public page — no app navigation chrome', async ({ page }) => {
		await page.goto('/faq');
		await expect(page.getByTestId('faq')).toBeVisible();
		// The app header nav (Paycheck / Bills / Add a bill) is hidden on public pages.
		await expect(page.getByRole('link', { name: 'Add a bill' })).toHaveCount(0);
	});

	test('makes no external network / analytics request', async ({ page }) => {
		const offOrigin: string[] = [];
		page.on('request', (req) => {
			const url = req.url();
			const local =
				url.startsWith('http://localhost:4173') ||
				url.startsWith('blob:') ||
				url.startsWith('data:');
			if (!local) offOrigin.push(`${req.method()} ${url}`);
		});

		await page.goto('/faq');
		await expect(page.getByTestId('faq')).toBeVisible();

		expect(offOrigin, 'the FAQ page made off-origin requests').toEqual([]);
	});

	test('links to Trust and Privacy Policy resolve', async ({ page }) => {
		await page.goto('/faq');

		await page.getByTestId('faq-trust-link').click();
		await expect(
			page.getByRole('heading', { level: 1, name: 'Why you can trust BillBuffer' })
		).toBeVisible();

		await page.goBack();
		await page.getByTestId('faq-privacy-link').click();
		await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
	});
});
