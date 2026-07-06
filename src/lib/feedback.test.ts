import { describe, it, expect } from 'vitest';
import { FEEDBACK_EMAIL, FEEDBACK_SUBJECT, feedbackBody, feedbackMailto } from './feedback';

describe('beta feedback mailto', () => {
	it('body stamps the version and carries every fixed prompt', () => {
		const body = feedbackBody('9.9.9 (abc1234)');
		expect(body).toContain('Version: 9.9.9 (abc1234)');
		expect(body).toContain('Device:');
		expect(body).toContain('What were you trying to do?');
		expect(body).toContain('What happened?');
		expect(body).toContain('What did you expect?');
		expect(body).toContain("Anything you'd change?");
	});

	it('builds a mailto to the feedback inbox with the fixed subject', () => {
		const url = feedbackMailto('1.2.3');
		expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
		const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
		expect(query.get('subject')).toBe(FEEDBACK_SUBJECT);
		expect(query.get('subject')).toBe('BillBuffer Feedback');
		expect(query.get('body')).toContain('Version: 1.2.3');
	});

	it('encodes spaces as %20 (not +) so mail clients render the body correctly', () => {
		const url = feedbackMailto('1.0.0');
		expect(url).not.toContain('+');
		expect(url).toContain('%20');
	});

	it('interpolates whatever version string it is given', () => {
		expect(feedbackMailto('7.7.7')).toContain('Version%3A%207.7.7');
	});
});
