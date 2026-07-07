import { test, expect } from '@playwright/test';

// Public /legal/privacy page: prerendered static privacy policy that reads with no
// JavaScript and makes no external request. It is separate from the interactive in-app
// /privacy screen (Export/Import/Delete), which is unchanged.

test.describe('Privacy Policy page (/legal/privacy)', () => {
	test('renders the plain-English policy, contacts, and a Trust link', async ({ page }) => {
		await page.goto('/legal/privacy');

		await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();

		const s = page.getByTestId('policy-sections');
		await expect(s).toContainText('no accounts'); // no accounts
		await expect(s).toContainText('does not connect to your bank'); // no bank connection
		await expect(s).toContainText('stored only in your browser'); // data stays on device
		await expect(s).toContainText('does not receive'); // does not receive/store
		await expect(s).toContainText('no analytics'); // no analytics/advertising
		await expect(s).toContainText('server logs'); // routine hosting logs
		await expect(s).toContainText('you choose to send'); // email only if you send
		await expect(s).toContainText('export a backup'); // exported backups are user files
		await expect(s).toContainText('your responsibility'); // local data loss
		await expect(s).toContainText('will change first'); // policy changes on new collection

		// Standalone identity: no parent-company attribution appears on the page.
		await expect(page.getByTestId('policy')).not.toContainText('Equilibrium');

		await expect(page.getByTestId('policy-privacy-contact')).toHaveAttribute(
			'href',
			'mailto:privacy@billbuffer.app'
		);
		await expect(page.getByTestId('policy-feedback-contact')).toHaveAttribute(
			'href',
			'mailto:feedback@billbuffer.app'
		);
		await expect(page.getByTestId('policy-trust-link')).toHaveAttribute('href', '/trust');
	});

	test('is a public page — no app navigation chrome', async ({ page }) => {
		await page.goto('/legal/privacy');
		await expect(page.getByTestId('policy')).toBeVisible();
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

		await page.goto('/legal/privacy');
		await expect(page.getByTestId('policy')).toBeVisible();

		expect(offOrigin, 'the privacy policy made off-origin requests').toEqual([]);
	});

	test('the Trust page links to the Privacy Policy', async ({ page }) => {
		await page.goto('/trust');
		const link = page.getByTestId('trust-privacy-link');
		await expect(link).toHaveAttribute('href', '/legal/privacy');
		await link.click();
		await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
	});
});
