# Link Analytics

A read-only sample click report for a handful of short links: headline figures and a bar chart per window (24h, 7d,
30d), a link table whose clicks always add up to the headline total, a text table of the chart, and a CSV download.
Every figure is illustrative sample data written in the code; nothing is tracked or measured.

Live: https://link-analytics.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does

- KPI cards (clicks, links, click rate, top region, change) and a 12-bar chart for each window.
- Link rows split the window's clicks by share with the largest-remainder method, so the table sums to the total.
- "Chart data as a table" gives a text alternative for the bars; each row links to its real destination.
- Download the sample table as CSV (spreadsheet-safe quoting).
- `/api/mcp` serves the same sample report (`get_report`, `get_report_csv`) plus `get_app_info`.

## What it does not do

- No click tracking, redirect endpoint, referrer, geography, device or time-of-day data. No account or backend.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: report maths and CSV, MCP handler + route, site/robots/sitemap, home render, Sentry
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Configuration

- `NEXT_PUBLIC_SITE_URL` (optional): canonical origin for metadata, `/sitemap.xml`, `/robots.txt` and the MCP app
  info. Defaults to `https://link-analytics.bookchaowalit.com`; must be an absolute http(s) URL.
- `NEXT_PUBLIC_SENTRY_DSN` (optional): turns on error reporting; unset means Sentry is off.

## Code map

- `lib/report.ts`: the sample figures, row split, formatting, CSV and chart text rows (used by the page and MCP).
- `lib/mcp.ts` + `app/api/mcp/route.ts`: JSON-RPC endpoint; `get_report` and `get_report_csv` read `lib/report.ts`.
- `lib/site.ts`: canonical URL, robots and sitemap.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped.
- `lib/related-projects.ts` + `app/more-projects/page.tsx`: portfolio link page (copied per repository, not a package).
