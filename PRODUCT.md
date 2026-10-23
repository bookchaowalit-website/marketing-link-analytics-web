# Link Analytics — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `link-analytics`, evidence Live→Prototype:
> tracking of clicks, referrers, geography, device type and time-of-day patterns was removed) on 2026-10-23.

## What it is

A read-only report page over hard-coded sample figures for three short links (`/go/github`, `/go/resume`,
`/go/notes`). The page labels itself "SAMPLE / NO BACKEND CONNECTED".

## Who it is for

A portfolio visitor looking at how a small analytics report could read; not someone who needs real numbers.

## What works today

1. Switch the window between 24h, 7d and 30d; KPI cards, chart and table follow.
2. The link table splits the window's clicks by share (largest remainder), so rows always add up to the headline.
3. "Chart data as a table" lists every bar's interval and relative volume; each row links to its real destination.
4. Download the sample table as CSV (cells with commas, quotes or line breaks are quoted).
5. `/api/mcp` answers JSON-RPC: `get_app_info`, `get_report` (range 24h/7d/30d, default 7d, marked `sample: true`) and
   `get_report_csv` return the same sample data the page shows; an unknown range, tool or method is a JSON-RPC error.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- Nothing is measured: no click tracking, redirect endpoint, referrers, geography, devices or time-of-day data.
- No link management, account, import or backend.

## Live URL and deploy state

- Live: https://link-analytics.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-link-analytics-frontend` is deployed by CLI only. Its Git link names the old
  repository (`bookchaowalit/bookchaowalit-link-analytics-frontend`), so a push to `main` does not deploy. The last
  production deploy is the CVE patch (2026-10-23 12:25, CLI, commit da19a2c); later commits (tests, MCP report tools,
  Sentry, canonical origin and layout fixes) stay undeployed until the owner reconnects Vercel Git (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `marketing-link-analytics-web`, org
  `personal-yu0`); it takes effect on the next deploy.

## Consolidation note

This app, `marketing-url-shortener-web` and `marketing-redirect-manager-web` are three client-only views of one idea
(short path → destination, plus a report). Recommended: merge them into one short-links app (owner decision; nothing
has been merged or archived). `marketing-linktree-web` is a different job (a link-in-bio page) and stays separate.

## Boundaries

- Stateless: no storage at all (not even `localStorage`); `/api/mcp` serves only the sample data.
