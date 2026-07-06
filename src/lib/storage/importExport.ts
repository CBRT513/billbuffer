// Local JSON export/import — the IMPURE half: browser file download/upload and the
// validate-then-persist orchestration. Lives under storage/ (the sanctioned
// browser/persistence area) because it touches the DOM and writes IndexedDB; the pure
// serialize/parse logic it builds on is in $lib/backup/backup.

import type { AppData } from '$lib/types';
import type { ValidateOptions, ValidationResult } from '$lib/validation/validate';
import { BACKUP_FILENAME, parseBackup, serializeAppData } from '$lib/backup/backup';
import { saveAppData } from './db';

/** Trigger a browser download of the current AppData as billbuffer-backup.json. */
export function downloadBackup(data: AppData): void {
	if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
		throw new Error('downloadBackup requires a browser environment.');
	}
	const blob = new Blob([serializeAppData(data)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = BACKUP_FILENAME;
	a.rel = 'noopener';
	// Anchor must be connected to the document for the download to fire reliably
	// across browsers (and to be observable by automation).
	document.body.appendChild(a);
	try {
		a.click();
	} finally {
		a.remove();
		URL.revokeObjectURL(url);
	}
}

/**
 * Validate backup text and, ONLY on success, replace stored state with the normalized
 * result. On ANY failure (bad JSON or a validation rejection) nothing is written, so
 * the current data is left untouched. Returns the validator's result either way.
 */
export async function importBackupText(
	text: string,
	options: ValidateOptions
): Promise<ValidationResult> {
	const result = parseBackup(text, options);
	if (result.ok) {
		await saveAppData(result.value);
	}
	return result;
}

/** Read an uploaded file's text (browser FileReader). Thin wrapper for the import UI. */
export function readBackupFile(file: Blob): Promise<string> {
	if (typeof FileReader === 'undefined') {
		return Promise.reject(new Error('readBackupFile requires a browser environment.'));
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}
