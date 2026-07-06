// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Injected by Vite `define` (see vite.config.ts): compile-time version/build stamp.
	const __APP_VERSION__: string;
	const __APP_BUILD__: string;
}

export {};
