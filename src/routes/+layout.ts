// Static PWA in SPA mode: the app is client-rendered and runs fully offline
// (IndexedDB on-device, no backend). adapter-static emits an `index.html` fallback
// that boots the SPA for every route. Individual routes can opt back into
// prerendering later if useful.
export const ssr = false;
export const prerender = false;
