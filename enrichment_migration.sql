-- ============================================================
-- BSDetective Enrichment Migration
-- Run in Supabase SQL Editor
-- Adds GDELT + MBFC enrichment columns to crawler_scans
-- and creates the domain_enrichment lookup table
-- ============================================================

-- ── 1. DOMAIN ENRICHMENT TABLE ───────────────────────────────────────────────
-- Populated once by load-mbfc.js, then queried per scan at insert time
-- Source: Media Bias Fact Check via community dataset

CREATE TABLE IF NOT EXISTS domain_enrichment (
  domain               text PRIMARY KEY,
  mbfc_bias            text,     -- Left | Left-Center | Least Biased | Right-Center | Right | Extreme Right | Conspiracy-Pseudoscience | Pro-Science | Satire
  mbfc_factuality      text,     -- Very High | High | Mostly Factual | Mixed | Low | Very Low | N/A
  mbfc_country         text,
  mbfc_credibility     text,     -- derived: HIGH | MIXED | LOW | DISPUTED
  source               text DEFAULT 'mbfc',   -- mbfc | manual
  updated_at           timestamptz DEFAULT now()
);

-- Index for fast join at crawl time
CREATE INDEX IF NOT EXISTS idx_domain_enrichment_domain ON domain_enrichment(domain);

-- ── 2. ADD ENRICHMENT COLUMNS TO crawler_scans ───────────────────────────────
-- All nullable — enrichment is best-effort, never blocks a scan

ALTER TABLE crawler_scans
  ADD COLUMN IF NOT EXISTS gdelt_tone        float,      -- GDELT pre-computed tone score (-100 to +100, negative = hostile)
  ADD COLUMN IF NOT EXISTS gdelt_source      boolean DEFAULT false,  -- true = article discovered via GDELT, not RSS
  ADD COLUMN IF NOT EXISTS mbfc_bias         text,       -- from domain_enrichment lookup
  ADD COLUMN IF NOT EXISTS mbfc_factuality   text,       -- from domain_enrichment lookup
  ADD COLUMN IF NOT EXISTS mbfc_credibility  text;       -- derived label

-- ── 3. HELPER VIEW: enriched scan view ───────────────────────────────────────
-- Makes querying the joined data easy for reporting and the Manipulation Index

CREATE OR REPLACE VIEW crawler_scans_enriched AS
SELECT
  cs.*,
  de.mbfc_bias         AS de_bias,
  de.mbfc_factuality   AS de_factuality,
  de.mbfc_credibility  AS de_credibility
FROM crawler_scans cs
LEFT JOIN domain_enrichment de ON cs.article_domain = de.domain;

-- ── 4. REFRESH MATERIALIZED VIEWS ────────────────────────────────────────────
-- Run after load-mbfc.js populates domain_enrichment

-- REFRESH MATERIALIZED VIEW domain_integrity_weekly;
-- REFRESH MATERIALIZED VIEW tactic_frequency_weekly;

-- ── VERIFICATION QUERIES ─────────────────────────────────────────────────────
-- After running load-mbfc.js, confirm enrichment loaded:
--
-- SELECT COUNT(*) FROM domain_enrichment;
--   → Should be 3,000+ rows
--
-- SELECT * FROM domain_enrichment LIMIT 10;
--   → Spot check bias/factuality labels
--
-- SELECT cs.article_domain, cs.spi_score, cs.mbfc_bias, cs.mbfc_factuality
-- FROM crawler_scans cs
-- JOIN domain_enrichment de ON cs.article_domain = de.domain
-- LIMIT 20;
--   → Should show enrichment columns populated for known domains
