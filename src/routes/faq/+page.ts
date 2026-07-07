// Public FAQ at /faq. Prerendered to plain static HTML that reads with no JavaScript,
// matching /trust and /legal/privacy. The app root defaults to SPA (ssr=false); this
// route opts back into server rendering at build time. Pure content — no data, no state.
export const prerender = true;
export const ssr = true;
export const csr = false;
