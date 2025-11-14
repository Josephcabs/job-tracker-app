# Job Tracker App — Start Guide

## Prerequisites
- Node.js 18.18+ (Next.js 16 requirement); manage via `nvm use 18` or install directly.
- npm 10+ (bundled with recent Node releases).
- macOS/Linux need build tools for `better-sqlite3` (Xcode Command Line Tools or `build-essential`).
- No external DB setup required; the SQLite file lives at `data/jobs.db`.

## Install Dependencies
```bash
npm install
Run the Development Server
bash

npm run dev
Launches Next.js at http://localhost:3000.
Hot reload is enabled; edit app/page.tsx (or any file under app/) and the browser updates automatically.
Production Build & Preview
bash

npm run build   # create the optimized bundle
npm run start   # serve the production build on port 3000
Lint the Project
bash

npm run lint
Uses the repo’s ESLint/TypeScript config (eslint.config.mjs) to keep the codebase consistent.
Folder Highlights
app/ — Next.js App Router pages, layouts, and API routes (see app/api/jobs/* for job endpoints).
data/jobs.db — SQLite database used through better-sqlite3 (no migrations or seeds required out of the box).
lib/ — Shared utilities (DB helpers, data-access code).
public/ — Static assets served as-is.
Common Workflow
npm install
npm run dev and develop against localhost (line 3000)
Run npm run lint before committing
For deployment, npm run build then npm run start on your hosting provider (Vercel recommended for Next.js apps)

