# Job Tracker App

Clean up the chaos of a job search with a single view of every lead, status, note, and application link. The app is a Next.js UI backed by a local SQLite database, so everything runs locally without additional services.

## Features at a Glance
- Track every role in a single SQLite file (`data/jobs.db`) that ships with the repo.
- Import JSON straight from Apify (single object or array) via the in-app “Quick import” panel or the `/api/jobs/bulk` endpoint.
- Filter and search by keyword or pipeline stage (`New → Applied → Interviewed → Rejected` plus `Interested` and `Not Interested`).
- Inline stats show how many roles you’re tracking, how many you’ve applied to, and how many companies you’re covering.
- Role detail drawer lets you update status, jot personal notes, open saved apply links, and delete or close a record in a couple of clicks.

## Requirements
- **Node.js 18.18+** (Next.js 13 App Router / Server Actions baseline).
- **npm 10+** (bundled with current Node releases).
- macOS/Linux only: install build tools needed by `better-sqlite3` (`xcode-select --install` on macOS or `build-essential` on Debian/Ubuntu).

> The SQLite database lives at `data/jobs.db`. Delete it if you ever want to reset the dataset—Next.js will recreate the file on the next request.

## Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Start the dev server with hot reload on http://localhost:3000
npm run dev
```

### Production Build
```bash
npm run build   # bundle app for production
npm run start   # run the optimized build (defaults to port 3000)
```

### Linting
```bash
npm run lint    # runs eslint.config.mjs for TS + Next.js lint rules
```

## Using the App
### 1. Import leads fast
- Click **📥 Import Jobs** in the header.
- Paste raw JSON from Apify (either a single job object or an array). Example payload:

```json
[
  {
    "title": "Senior Frontend Engineer",
    "companyName": "Hexa",
    "location": "Remote",
    "via": "Apify",
    "description": "Work on the candidate experience...",
    "applyLink": [{ "title": "Company site", "link": "https://example.com/apply" }]
  }
]
```
- Hit **Import jobs**. The app adds the roles with the default status `New`. Use the bulk API endpoint (`POST /api/jobs/bulk`) if you prefer scripting.

### 2. Stay organized with filters & search
- Use the search box to match against title, company, or description keywords.
- Click any status pill to filter down to that stage; pick **All** to reset.
- The summary chips track how many jobs match the current filters so you always know what you’re looking at.

### 3. Track progress from the detail drawer
1. Select a role from the left panel.  
2. Update the status by tapping the pipeline pills (`New`, `Interested`, `Applied`, `Interviewed`, `Rejected`, `Not Interested`).  
3. Record interview notes, follow-ups, or salary info in the Notes box and click **Save notes** when you’re done.  
4. Launch saved apply links directly from the “Apply links” card or remove the role entirely with **🗑️ Delete role**.

### 4. Keep tabs on overall momentum
- The stat cards show total roles, new leads, how many you’ve applied to, and how many unique companies you’re tracking—great for weekly retros.
- The “Refresh” button re-fetches both the job list and stats if you’re updating data through scripts or another team member.

## Automating with the API
Use these REST endpoints if you want to script imports or hook the tracker up to other tools:
- `GET /api/jobs?status=applied&search=react` — filter jobs by status or keyword.
- `GET /api/jobs/:id` — read a single job plus its apply links.
- `PATCH /api/jobs/:id` — send `{ "status": "interviewed" }` or `{ "notes": "Met with recruiter" }` to update progress.
- `DELETE /api/jobs/:id` — remove a single job; `DELETE /api/jobs/bulk` accepts an array of IDs for batch deletes.
- `POST /api/jobs/bulk` — create many jobs in one request (same JSON structure as the importer).
- `GET /api/stats` — returns `{ total, new, applied, interviewed, rejected, companies }` counts for dashboards or Slack bots.

## Project Layout Highlights
- `app/` — Next.js App Router pages, layouts, and API routes.
- `app/api/jobs/*` — All job CRUD endpoints referenced above.
- `lib/` — Database helpers (`lib/db.ts`) that wrap `better-sqlite3`.
- `data/jobs.db` — SQLite database file (checked into the repo for local dev).
- `public/` — Static assets served as-is.

Run `npm run lint` before committing, and deploy via `npm run build && npm run start` (Vercel is a perfect fit). Enjoy the calmer job search, bro. 💼
