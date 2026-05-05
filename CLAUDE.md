# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BSDetective is a Chrome extension + backend system that detects manipulation tactics, logical fallacies, and persuasion patterns in web content. Users click "Analyze This Page" and receive an SPI (Structural Persuasion Index) score with detailed tactic breakdowns. Monetized via Lemon Squeezy with free/founding/pro/family tiers.

## Repository Structure

This is a monorepo-style directory (not git-managed at root). Key components:

- **Root files** (`manifest.json`, `popup.js`, `popup.html`, `background.js`, `content.js`, `styles.css`) — the Chrome extension source (older working copies)
- **`BSD ext latest 25032026/`** — packaged extension releases
  - `bsdetective-v2.0.0-CWS/` — Chrome Web Store submission build
  - `bsdetective-v2.0.0-full/` — full build including Supabase functions, migrations, and TAXONOMY.md
- **`BSD Crawler/`** — autonomous data pipeline (crawler + analyzer), has its own CLAUDE.md
- **`bsdetective-backend/supabase/functions/`** — Supabase Edge Functions: `analyze`, `entitlements`, `share-unlock`, `webhook-lemon`
- **`bsdetective-site/`** — marketing website (bsdetective.io), landing page + legal pages
- **`icons/`** — extension icons and CWS assets

## Architecture

### Data Flow

1. **Extension** (`popup.js`) extracts page text via `chrome.scripting.executeScript`, sends to `analyze-vnext` Edge Function
2. **Edge Function** (`analyze-vnext/index.ts`) runs the AI analysis via Anthropic API (Haiku for free tier, Sonnet for paid), caches results by content hash, returns SPI score + tactics
3. **Crawler pipeline** (`BSD Crawler/`) independently collects articles from RSS feeds and GDELT, queues them in `crawler_queue`, then `analyzer.js` sends them through the same `analyze-vnext` Edge Function and stores results in `crawler_scans`

### Detection Taxonomy

`TAXONOMY.md` (in `BSD ext latest 25032026/bsdetective-v2.0.0-full/`) is the **single source of truth** for all 199 detection patterns across 5 layers:

- **Layer 1** (Academic): Cialdini, Kahneman, Haidt, van der Linden — names used directly, citable
- **Layer 2** (US Intelligence/Military): KUBARK, FM 3-05.301, CIA PSYOP — translated to plain-English heuristics
- **Layer 3** (Soviet/KGB): Dezinformatsiya, active measures — named patterns with detection rules
- **Layer 4** (Practitioner): Compliance psychology, SERE-informed — informs logic only, never surfaced to users
- **Layer 5** (BSDetective-owned): All user-facing technique names

**Source separation rule**: Layers 2–4 inform detection logic but are NEVER surfaced to users. Layer 5 names appear in results. Layer 1 names appear as `academic_name` references.

**Taxonomy protection rules**:
- NEVER rebuild TAXONOMY.md from scratch — only append new techniques
- Every technique has a permanent ID (F01, M15, B07, etc.) — IDs are never reused
- The Edge Function prompt is DERIVED from TAXONOMY.md, not the other way around
- When adding techniques: add to TAXONOMY.md first, then update the Edge Function prompt

### Supabase Project

- Project ref: `glxqwdtodzplniyqtpuw`
- Edge Functions: `analyze-vnext` (main analysis), `analyze` (legacy), `entitlements`, `share-unlock`, `webhook-lemon`
- Key tables: `analysis_cache`, `scan_log`, `crawler_queue`, `crawler_scans`, `crawler_scan_tactics`, `domain_enrichment`
- Materialized views: `domain_integrity_weekly`, `tactic_frequency_weekly` (refresh weekly)

### Pricing Tiers

| Tier | Price | Scans | Model |
|------|-------|-------|-------|
| Free | $0 | 5/week | claude-haiku-4-5 |
| Founding Member | $6.99/mo | Unlimited | claude-sonnet-4-6 |
| Pro | $9.99/mo or $89/yr | Unlimited | claude-sonnet-4-6 |
| Family | $14.99/mo (5 seats) | Unlimited | claude-sonnet-4-6 |

Checkout via Lemon Squeezy. URLs configured in `popup.js` `CONFIG.UPGRADE_URLS`.

### SPI Score

SPI = Structural Persuasion Index (0–100). Measures density and sophistication of persuasion architecture, NOT truth/accuracy. Risk tiers: minimal (0–15), low (16–35), moderate (36–55), elevated (56–75), high (76–90), critical (91–100).

## Extension Details

- Manifest V3, permissions: `activeTab`, `storage`, `scripting`
- Content extraction: grabs `<article>` or `<main>` or `<body>`, strips nav/header/footer, truncates to 4,000 chars
- Dev mode auto-detected via `!('update_url' in chrome.runtime.getManifest())` — grants unlimited Pro-tier scans
- Weekly scan counter uses Monday-based weeks, stored in `chrome.storage.local`
- Analysis results show 6 sections: SPI score, The Play, Emotional Targets, Blind Spots (paywalled), Tactics Detected (limited on free), The Verdict
- Paid features: full blind spots, all tactics (free shows 2), rebuttal generation

## Commands

```bash
# Crawler pipeline (from BSD Crawler/)
npm install
npm run crawl                    # run RSS + GDELT crawler
node analyzer.js                 # process queue through analyze-vnext
node load-mbfc.js                # populate MBFC bias/factuality data

# Edge Function deployment
supabase functions deploy analyze-vnext --project-ref glxqwdtodzplniyqtpuw

# Set required secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Environment Variables

- `SUPABASE_URL` — project URL (used by crawler, analyzer, load-mbfc)
- `SUPABASE_SERVICE_KEY` — service role key (used by crawler, analyzer, load-mbfc)
- `SUPABASE_ANON_KEY` — anon/publishable key (used by analyzer to call edge function, hardcoded in extension popup.js)
- `ANTHROPIC_API_KEY` — set as Supabase secret for the edge function
- `FEED_START` / `FEED_END` — optional, slice feed list for parallel crawler batch jobs

## Pending Work

### 1. Broken RSS Feeds

The following feeds in `BSD Crawler/crawler.js` `ALL_FEEDS` are returning 404/403 and need replacement URLs:

- News24 (`news24.com`)
- EWN (`ewn.co.za`)
- DW English (`dw.com`)
- VOA News (`voanews.com`)
- ZeroHedge (`zerohedge.com`)
- France24 (`france24.com`)
- The Guardian (`theguardian.com`)
- Daily Maverick (`dailymaverick.co.za`)
- Africa Report (`theafricareport.com`)

### 2. Analyzer MBFC Enrichment Patch

`BSD Crawler/analyzer.js` `storeScan()` reads from the in-memory `mbfcCache` and spreads MBFC fields into the `crawler_scans` insert, but `mbfc_bias`, `mbfc_factuality`, and `mbfc_credibility` are not being written correctly to `crawler_scans` rows during queue processing. Needs investigation and fix.

### 3. Extension Field Name Check

Verify the Chrome extension (`popup.js`) sends the field `text` (not `content`) in the POST body to `analyze-vnext`. Current code at line 238 sends `{ text: pageContent, url, title, tier }` — confirm the Edge Function expects `text` as the field name, not `content`.
