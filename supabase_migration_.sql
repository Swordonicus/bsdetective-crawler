-- BSDetective Crawler Schema v2
-- Run in Supabase SQL Editor before first crawler run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── MAIN SCAN TABLE ──────────────────────────────────────────────────────────
create table if not exists crawler_scans (
  id uuid primary key default gen_random_uuid(),

  -- Version control (non-negotiable — allows historical dataset interpretation)
  analyzer_version      text not null,
  taxonomy_version      text not null,
  prompt_version        text not null,

  -- Publisher identity
  feed_url              text,
  publisher_name        text,
  publisher_domain      text,
  region                text,                   -- ZA | UK | US | INT
  country               text,
  media_class           text,                   -- broadsheet | tabloid | digital_native | state_media | fringe
  topic_class           text,                   -- politics | general_news | business | opinion

  -- Article identity
  article_url           text,
  article_domain        text,
  headline_text         text,                   -- stored separately for headline vs body analysis
  published_at          timestamptz,

  -- Content quality signals
  content_hash          text not null unique,
  content_length        integer,                -- pre-truncation character count
  truncated             boolean default false,
  content_extraction_type text,                 -- full_content_encoded | content | snippet | summary | title_only

  -- Language — model quality flagging
  -- Haiku degrades on Afrikaans, Zulu, code-switched SA English
  -- in_distribution = false means exclude from benchmarks until calibrated
  language              text default 'en',
  language_confidence   text default 'heuristic',
  in_distribution       boolean default true,

  -- Scan provenance
  scan_source           text not null default 'crawler',  -- crawler | extension | api
  scan_status           text not null default 'success',  -- success | skipped | feed_error | analysis_error
  scan_status_reason    text,
  scanned_at            timestamptz not null default now(),

  -- BSDetective structured output
  spi_score             integer,
  the_play              text,
  emotional_targets     text,
  blind_spots           text,
  the_verdict           text,
  raw_output            jsonb                   -- full response preserved for schema evolution
);

-- ── TACTICS TABLE (flattened — one row per tactic per scan) ──────────────────
-- Enables: top tactics by publisher, tactic frequency by region,
--          emerging tactics by quarter, correlation with SPI
create table if not exists crawler_scan_tactics (
  id               uuid primary key default gen_random_uuid(),
  scan_id          uuid not null references crawler_scans(id) on delete cascade,
  tactic_code      text,
  tactic_label     text,
  severity         text,
  evidence_excerpt text,
  taxonomy_version text not null,
  created_at       timestamptz not null default now()
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists idx_cs_publisher_domain   on crawler_scans(publisher_domain);
create index if not exists idx_cs_scanned_at         on crawler_scans(scanned_at desc);
create index if not exists idx_cs_spi_score          on crawler_scans(spi_score);
create index if not exists idx_cs_region             on crawler_scans(region);
create index if not exists idx_cs_scan_source        on crawler_scans(scan_source);
create index if not exists idx_cs_scan_status        on crawler_scans(scan_status);
create index if not exists idx_cs_taxonomy_version   on crawler_scans(taxonomy_version);
create index if not exists idx_cs_in_distribution    on crawler_scans(in_distribution);
create index if not exists idx_cs_media_class        on crawler_scans(media_class);
create index if not exists idx_cst_scan_id           on crawler_scan_tactics(scan_id);
create index if not exists idx_cst_tactic_code       on crawler_scan_tactics(tactic_code);
create index if not exists idx_cst_taxonomy_version  on crawler_scan_tactics(taxonomy_version);

-- ── DOMAIN INTEGRITY WEEKLY (materialised view) ───────────────────────────────
-- Your publishable Source Integrity Ratings — refresh weekly
-- Only includes in-distribution (English) scans with successful status
create materialized view if not exists domain_integrity_weekly as
select
  publisher_domain,
  publisher_name,
  media_class,
  region,
  country,
  date_trunc('week', scanned_at)   as week,
  round(avg(spi_score))            as avg_spi,
  count(*)                         as scan_count,
  min(spi_score)                   as min_spi,
  max(spi_score)                   as max_spi,
  taxonomy_version
from crawler_scans
where
  spi_score   is not null
  and scan_status     = 'success'
  and in_distribution = true       -- exclude out-of-distribution language scans
group by
  publisher_domain, publisher_name, media_class, region, country,
  date_trunc('week', scanned_at), taxonomy_version
order by week desc, avg_spi desc;

-- ── TACTIC FREQUENCY WEEKLY (materialised view) ───────────────────────────────
-- Tracks which manipulation tactics are trending — your Narrative Threat Index seed
create materialized view if not exists tactic_frequency_weekly as
select
  t.tactic_code,
  t.tactic_label,
  date_trunc('week', s.scanned_at) as week,
  s.region,
  s.media_class,
  count(*)                         as occurrences,
  round(avg(s.spi_score))          as avg_spi_when_present,
  t.taxonomy_version
from crawler_scan_tactics t
join crawler_scans s on t.scan_id = s.id
where
  s.scan_status     = 'success'
  and s.in_distribution = true
group by
  t.tactic_code, t.tactic_label, date_trunc('week', s.scanned_at),
  s.region, s.media_class, t.taxonomy_version
order by week desc, occurrences desc;

-- ── REFRESH COMMANDS (run weekly via Supabase cron or manually) ───────────────
-- refresh materialized view domain_integrity_weekly;
-- refresh materialized view tactic_frequency_weekly;

-- ── HEALTH CHECK QUERY ───────────────────────────────────────────────────────
-- Run this after first crawler run to verify data is landing correctly:
/*
select
  date_trunc('day', scanned_at)    as day,
  scan_status,
  count(*)                         as scans,
  round(avg(spi_score))            as avg_spi,
  count(*) filter (where in_distribution = false) as out_of_dist
from crawler_scans
group by 1, 2
order by 1 desc;
*/
