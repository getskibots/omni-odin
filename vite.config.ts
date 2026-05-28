import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Always root-relative. omni-odin deploys to Vercel; no GH Pages subpath.
  base: '/',
  plugins: [react()],
  // Different port than omni (5175) to allow both to run concurrently.
  server: { port: 5176, strictPort: true },
});
