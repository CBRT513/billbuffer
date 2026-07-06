// Beta feedback deep-link. Privacy-preserving by construction: this builds a `mailto:`
// URL that the user's own email app opens — the app itself sends nothing, stores nothing,
// and makes no network request. No analytics, no telemetry, no backend, no accounts.

// TODO(founder): confirm the beta feedback inbox before merge — this is the only value
// that must be verified. It is a plain recipient address, nothing else depends on it.
export const FEEDBACK_EMAIL = 'clif@barge2rail.com';

export const FEEDBACK_SUBJECT = 'BillBuffer Feedback';

// The email body template. The version is stamped in; the user fills the rest in their
// own mail client. "Device:" is intentionally left blank — the app never reads device
// info; the user shares only what they choose to type.
export function feedbackBody(version: string): string {
	return [
		`Version: ${version}`,
		'Device:',
		'',
		'What were you trying to do?',
		'',
		'What happened?',
		'',
		'What did you expect?',
		'',
		"Anything you'd change?",
		''
	].join('\n');
}

// A `mailto:` URL with an RFC-compatible query. `URLSearchParams` encodes spaces as "+",
// which many mail clients render literally inside a body, so normalize them to %20.
export function feedbackMailto(version: string): string {
	const query = new URLSearchParams({
		subject: FEEDBACK_SUBJECT,
		body: feedbackBody(version)
	})
		.toString()
		.replace(/\+/g, '%20');
	return `mailto:${FEEDBACK_EMAIL}?${query}`;
}
