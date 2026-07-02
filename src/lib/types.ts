// App-data shell type.
//
// The full domain model (Paycheck, Bill, etc.) is specified in
// docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md and will be added in the
// data-layer PR — NOT here. This scaffold only needs a versioned container so the
// storage shell has something concrete to read/write.

export const SCHEMA_VERSION = 1;

export interface AppData {
	/** Storage schema version, for future migrations. */
	schemaVersion: number;
}

/** A fresh, first-run AppData record. No product logic. */
export function emptyAppData(): AppData {
	return { schemaVersion: SCHEMA_VERSION };
}
