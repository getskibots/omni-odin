/**
 * Tiny helper: decides whether to call the Vercel /api/* proxy or talk to
 * OpenAI / ElevenLabs directly from the browser (using a localStorage key).
 *
 * Production builds (Vercel deploy) → proxy. No key paste needed.
 * Local dev (vite dev)              → direct call with localStorage key (fallback).
 *
 * Vite injects `import.meta.env.PROD` at build time:
 *   true  in `vite build` output (this is what Vercel ships)
 *   false in `vite dev` (Brandon's local dev server)
 */
export const USE_PROXY: boolean = import.meta.env.PROD;
