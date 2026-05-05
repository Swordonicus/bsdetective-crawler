import { createClient } from '@supabase/supabase-js';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const ANALYZE_URL          = `${SUPABASE_URL}/functions/v1/analyze-vnext`;

// How many items to process per run — tune this to stay under 55 minutes
// At ~35s per item worst case: 80 items = ~47 min. Safe ceiling.
const BATCH_LIMIT          = 80;
const REQUEST_DELAY_MS     = 1200;
const ANALYZE_TIMEOUT_MS   = 35000;

// ─── INIT ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function scanContent(text, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(ANALYZE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text, url, title: '', tier: 'free' }),
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`analyze-vnext ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function buildTacticVector(tactics) {
  if (!Array.isArray(tactics) || tactics.length === 0) return null;
  const severityWeight = { critical: 3, warning: 2, note: 1 };
  return tactics.map(t => ({
    code:   t.name ?? t.tactic_code ?? 'unknown',
    weight: severityWeight[t.severity] ?? 1,
  }));
}

// ─── MBFC ENRICHMENT CACHE ─────────────────────────────────────────────────
// Pre-loads all domain_enrichment rows into memory (~4,500 rows).
// Paginated to avoid Supabase's default 1000-row limit.

const mbfcCache = new Map();

async function loadMbfcCache() {
  const PAGE_SIZE = 1000;
  let from = 0;
  let total = 0;

  while (true) {
    const { data, error } = await supabase
      .from('domain_enrichment')
      .select('domain, mbfc_bias, mbfc_factuality, mbfc_credibility')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('⚠️  Failed to load MBFC cache:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      mbfcCache.set(row.domain, {
        mbfc_bias:        row.mbfc_bias,
        mbfc_factuality:  row.mbfc_factuality,
        mbfc_credibility: row.mbfc_credibility,
      });
    }

    total += data.length;
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return total;
}

async function markQueueItem(id, status, errorMessage = null) {
  await supabase
    .from('crawler_queue')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', id);
}

function lookupMbfc(item) {
  const strip = (d) => d?.replace(/^www\./i, '').toLowerCase();
  return mbfcCache.get(strip(item.article_domain))
      || mbfcCache.get(strip(item.publisher_domain))
      || null;
}

async function storeScan(item, result) {
  const mbfc = lookupMbfc(item);

  const { data, error } = await supabase
    .from('crawler_scans')
    .insert({
      // Version control
      analyzer_version:         item.analyzer_version,
      taxonomy_version:         item.taxonomy_version,
      prompt_version:           item.prompt_version,

      // Publisher
      feed_url:                 item.feed_url,
      publisher_name:           item.publisher_name,
      publisher_domain:         item.publisher_domain,
      region:                   item.region,
      country:                  item.country,
      media_class:              item.media_class,
      topic_class:              item.topic_class,

      // Article
      article_url:              item.article_url,
      article_domain:           item.article_domain,
      headline_text:            item.headline_text,
      published_at:             item.published_at,

      // Content
      content_hash:             item.content_hash,
      content_length:           item.content_length,
      truncated:                item.truncated,
      content_extraction_type:  item.content_extraction_type,

      // Language
      language:                 item.language,
      language_confidence:      item.language_confidence,
      in_distribution:          item.in_distribution,

      // Scan provenance
      scan_source:              item.source_type === 'facebook_ad' ? 'facebook_ad_scraper' : 'crawler',
      source_type:              item.source_type,
      scan_status:              'success',
      scanned_at:               new Date().toISOString(),

      // Facebook-specific
      ...(item.source_type === 'facebook_ad' && {
        advertiser_name:        item.advertiser_name,
        search_term:            item.search_term,
        ad_country:             item.ad_country,
        article_domain:         'facebook.com',
        analysis_scope:         'copy_only',
      }),

      // GDELT provenance
      gdelt_source:             item.source_type === 'gdelt_article',
      gdelt_tone:               null,  // GDELT artlist mode doesn't provide per-article tone

      // MBFC enrichment (from domain_enrichment cache)
      mbfc_bias:                mbfc?.mbfc_bias ?? null,
      mbfc_factuality:          mbfc?.mbfc_factuality ?? null,
      mbfc_credibility:         mbfc?.mbfc_credibility ?? null,

      // BSDetective output
      spi_score:                result.spi_score ?? null,
      the_play:                 result.the_play ?? null,
      emotional_targets:        result.emotional_targets ?? null,
      blind_spots:              result.blind_spots ?? null,
      the_verdict:              result.the_verdict ?? null,
      raw_output:               result,
      tactic_vector:            buildTacticVector(result.tactics ?? []),
    })
    .select('id')
    .single();

  if (error) throw error;

  // Insert tactic rows
  const tactics = result.tactics;
  if (data?.id && Array.isArray(tactics) && tactics.length > 0) {
    const tacticRows = tactics.map(t => ({
      scan_id:          data.id,
      tactic_code:      t.code       ?? null,
      tactic_label:     t.label      ?? t.name ?? null,
      severity:         t.severity   ?? null,
      evidence_excerpt: t.evidence   ?? t.excerpt ?? null,
      taxonomy_version: item.taxonomy_version,
    }));
    const { error: tacticError } = await supabase
      .from('crawler_scan_tactics')
      .insert(tacticRows);
    if (tacticError) console.warn('  ⚠️  Tactic insert failed:', tacticError.message);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔬 BSDetective Analyzer');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`📦 Processing up to ${BATCH_LIMIT} queued items`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  // Load MBFC credibility cache
  const mbfcCount = await loadMbfcCache();
  console.log(`🏷️  MBFC cache: ${mbfcCount} domains loaded`);

  // Fetch pending items from queue (oldest first)
  const { data: items, error } = await supabase
    .from('crawler_queue')
    .select('*')
    .eq('status', 'pending')
    .order('queued_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('❌ Failed to fetch queue:', error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✅ Queue empty — nothing to process.');
    return;
  }

  console.log(`📋 Found ${items.length} pending items\n`);

  const totals = { scanned: 0, errors: 0 };

  for (const item of items) {
    // Mark as processing (prevents duplicate processing if analyzer runs concurrently)
    await markQueueItem(item.id, 'processing');

    try {
      console.log(`🔍 [${item.source_type}] ${item.publisher_name} | ${item.headline_text?.slice(0, 50)}`);
      const result = await scanContent(item.body_text, item.article_url);
      await storeScan(item, result);
      await markQueueItem(item.id, 'done');
      const mbfc = lookupMbfc(item);
      const mbfcTag = mbfc ? `${mbfc.mbfc_credibility}` : 'no-mbfc';
      console.log(`  ✅ SPI ${result.spi_score ?? '?'} | ${item.language} | ${mbfcTag} | done`);
      totals.scanned++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      await markQueueItem(item.id, 'error', err.message);
      totals.errors++;
    }

    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log('\n─────────────────────────────────────');
  console.log('📊 Analyzer Run Summary');
  console.log(`  Processed  : ${items.length}`);
  console.log(`  Scanned    : ${totals.scanned}`);
  console.log(`  Errors     : ${totals.errors}`);
  console.log(`  Est. cost  : $${(totals.scanned * 0.006).toFixed(3)}`);

  // Report queue depth remaining
  const { count } = await supabase
    .from('crawler_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  console.log(`  Still pending in queue: ${count ?? '?'}`);
  console.log('─────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
