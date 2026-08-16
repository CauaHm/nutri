# Stack

Vite + React + TypeScript (SPA, `src/`) with Vercel Serverless Functions (`api/`, TypeScript, `@vercel/node`). No Next.js — it was removed after Next 16.3.1 and 15.5.23 both failed to serve any route on Vercel (build succeeded, every deployed path 404'd). Server-only code lives under `api/_lib/`; never import it from `src/`.
