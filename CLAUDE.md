# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BSDetective Crawler is the autonomous data pipeline for the BSDetective media manipulation detection platform. It collects news articles, queues them for AI analysis, and stores persuasion telemetry (SPI scores, manipulation tactics) in Supabase. This is one component of a larger system that includes a browser extension and website.

## Commands

```bash
npm install              # install dependencies
npm run crawl            # run the crawler (node crawler.js)
node analyzer.js         # process queued items through the analyze-vnext edge function
node load-mbfc.js        # populate domain_enrichment table with MBFC bias/factuality data
```

## Required Environment Variables

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase secret API key (`sb_secret_...`); used by all three
  scripts for database access. Legacy `service_role` JWT keys are deprecated (June 2026
  key migration) and must not be used.
- `SUPABASE_ANON_KEY` — Supabase publishable API key (`sb_publishable_...`); used only by
  analyzer.js to call the analyze-vnext edge function, sent on the `apikey` header only
  (publishable keys are not JWTs and must never be sent as `Authorization: Bearer`).
- `FEED_START` / `FEED_END` — optional, slice the feed list for parallel batch runs (default: all feeds)

## Architecture

### Two-Phase Pipeline

The system is split into two independent scripts that communicate via a Supabase queue table:

1. **crawler.js** — Collects articles, writes to `crawler_queue` with status `pending`. No AI calls. Two data sources:
   - **RSS feeds** (`ALL_FEEDS` array, 20 feeds): fetched with `fast-xml-parser` (supports RSS 2.0, Atom, and RDF 1.0 formats), article body extracted via naive HTML stripping. Feeds are sliceable via `FEED_START`/`FEED_END` for parallel GitHub Actions jobs (Batch A: 0–9, Batch B: 10–19).
   - **GDELT 2.0 Doc API**: free, no auth. Only runs when `FEED_START === 0` (Batch A) to avoid duplicate queries.

2. **analyzer.js** — Reads `pending` items from `crawler_queue`, sends body text to the `analyze-vnext` Supabase Edge Function (which runs the AI scoring), writes results to `crawler_scans` and `crawler_scan_tactics`. Marks queue items as `done` or `error`.

### Deduplication

Both scripts use `content_hash` (SHA-256 of body text) to skip duplicates. The crawler checks both `crawler_queue` and `crawler_scans` before inserting.

### MBFC Enrichment

`load-mbfc.js` fetches the IDIAP/MBFC CSV dataset, normalizes bias/factuality ratings, derives a credibility tier (HIGH/MIXED/LOW/DISPUTED), and upserts into `domain_enrichment`. The analyzer loads this table into an in-memory cache at startup and attaches MBFC data to each scan row.

### Database Schema (Supabase/Postgres)

Key tables:
- `crawler_queue` — pending articles awaiting analysis (status: pending → processing → done/error)
- `crawler_scans` — completed analysis results with SPI scores, tactics, MBFC enrichment
- `crawler_scan_tactics` — one row per tactic per scan (references `crawler_scans.id`)
- `domain_enrichment` — MBFC bias/factuality/credibility per domain

Materialized views (refresh weekly):
- `domain_integrity_weekly` — avg SPI per publisher per week (in-distribution only)
- `tactic_frequency_weekly` — tactic occurrence trends by region/media class

Schema migrations are in `supabase_migration_.sql` (base) and `enrichment_migration.sql` (MBFC/GDELT columns).

### Version Tracking

Every scan row records `analyzer_version`, `taxonomy_version`, and `prompt_version` (from `SCAN_VERSION` in crawler.js) to allow historical dataset interpretation across prompt/model changes.

### Runtime Constraints

- Crawler has an 18-minute hard budget (`RUN_BUDGET_MS`) to stay within GitHub Actions timeout
- Analyzer processes up to 80 items per run with 1.2s delay between requests
- Article content is capped at 8,000 chars; articles under 200 chars are skipped

### MBFC Enrichment in Analyzer

The analyzer uses a `lookupMbfc()` helper that tries `article_domain` then falls back to `publisher_domain` (both www-stripped) when looking up MBFC data from the in-memory cache. This ensures enrichment works even when `article_domain` is NULL or doesn't match the MBFC dataset exactly.

History (fixed May 2026): enrichment was silently failing because (a) `article_domain` was NULL for many queue items, (b) there was no fallback to `publisher_domain`, and (c) domain mismatches (e.g. `dailymail.com` vs `dailymail.co.uk`). After the fix, existing scans were backfilled: 22 → 2,239 of 2,768 enriched.

## Deployment

GitHub repo: `Swordonicus/bsdetective-crawler`. Runs on GitHub Actions via `crawler.yml` — daily at 06:00 UTC. The workflow has 4 jobs:

1. **RSS Feed Crawler (A)** — feeds 0–9 (ZA, Africa, UK, US mainstream) + GDELT queries
2. **RSS Feed Crawler (B)** — feeds 10–19 (state media, alt health, alt finance, international)
3. **Facebook Ad Library Scraper** — scrapes ad copy, runs in parallel with RSS crawlers
4. **Queue Analyzer** — waits for all crawlers, then processes up to 80 queued items

Secrets required in GitHub Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (`sb_secret_...`),
`SUPABASE_ANON_KEY` (`sb_publishable_...`). New-format API keys only — legacy JWT keys are
being phased out on the Supabase project.

### Removed Feeds

Three feeds are commented out with no working replacements as of May 2026:
- **EWN** (`ewn.co.za`) — no working RSS feed, site removed RSS support
- **Africa Report** (`theafricareport.com`) — 403 on all feed endpoints, likely paywalled
- **PoliticsWeb** (`politicsweb.co.za`) — Cloudflare-blocked

Consider replacing with SABC News, IOL, or Africanews.
