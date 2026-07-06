// Public trust page. Prerendered to plain static HTML that reads with no JavaScript.
// The app root defaults to SPA (ssr=false); this route opts back into server rendering
// at build time so the page is real HTML a first-time visitor can read instantly and
// offline. Pure content — no data, no state, no browser APIs.
export const prerender = true;
export const ssr = true;
