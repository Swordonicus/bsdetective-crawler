import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── VERSION CONTROL ────────────────────────────────────────────────────────
const SCAN_VERSION = {
  analyzer:  'vnext_haiku_2026_03',
  taxonomy:  'v1.0',
  prompt:    'crawler_v1.0',
};

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const ANALYZE_URL          = `${SUPABASE_URL}/functions/v1/analyze-vnext`;

const MAX_ADS_PER_QUERY    = 5;     // 5 ads × 14 queries = 70 max scans per run
const REQUEST_DELAY_MS     = 2000;  // respectful delay between page loads
const MIN_CONTENT_LENGTH   = 50;

// ─── SEARCH QUERIES ──────────────────────────────────────────────────────────
// Tier 1: highest manipulation density + newsletter surprise value
// Countries: US and UK — highest ad volume, English language
const QUERIES = [
  // High manipulation commercial
  { term: 'weight loss supplement', countries: ['US', 'GB'], category: 'health_commercial' },
  { term: 'financial freedom',      countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'work from home',         countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'debt relief',            countries: ['US', 'GB'], category: 'financial_services'},
  { term: 'make money online',      countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'limited time offer',     countries: ['US', 'GB'], category: 'ecommerce'         },
  { term: 'anti-aging',             countries: ['US', 'GB'], category: 'health_commercial' },

  // Surprising/newsletter gold
  { term: 'donate now',             countries: ['US', 'GB'], category: 'charity'           },
  { term: 'apply now university',   countries: ['US', 'GB'], category: 'higher_education'  },
  { term: 'investment opportunity', countries: ['US', 'GB'], category: 'financial_services'},
  { term: 'natural cure',           countries: ['US', 'GB'], category: 'health_commercial' },
  { term: 'join our team',          countries: ['US', 'GB'], category: 'recruitment'       },
  { term: 'exclusive membership',   countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'last chance',            countries: ['US', 'GB'], category: 'ecommerce'         },
];

// ─── INIT ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function isAlreadyScanned(contentHash) {
  const { data } = await supabase
    .from('crawler_scans')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();
  return !!data;
}

async function scanContent(text, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

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
      body: JSON.stringify({
        text:  text,
        url:   url,
        title: '',
        tier:  'free',
      }),
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

async function storeScan(ad, result) {
  const { data, error } = await supabase
    .from('crawler_scans')
    .insert({
      // Version control
      analyzer_version:  SCAN_VERSION.analyzer,
      taxonomy_version:  SCAN_VERSION.taxonomy,
      prompt_version:    SCAN_VERSION.prompt,

      // Publisher identity — using advertiser as publisher
      publisher_name:    ad.advertiserName,
      publisher_domain:  ad.advertiserName.toLowerCase().replace(/\s+/g, ''),
      feed_url:          ad.adUrl,
      region:            ad.country,
      country:           ad.country === 'US' ? 'United States' : 'United Kingdom',
      media_class:       'facebook_ad',
      topic_class:       ad.category,

      // Article identity — using ad as article
      article_url:       ad.adUrl,
      article_domain:    'facebook.com',
      headline_text:     ad.adText.slice(0, 200),
      published_at:      null,

      // Content
      content_hash:      ad.contentHash,
      content_length:    ad.adText.length,
      truncated:         false,
      content_extraction_type: 'facebook_ad_body',

      // Language
      language:          'en',
      language_confidence: 'assumed',
      in_distribution:   true,

      // Scan provenance
      scan_source:       'facebook_ad_scraper',
      source_type:       'facebook_ad',
      scan_status:       'success',
      scanned_at:        new Date().toISOString(),

      // Analysis scope — copy only. Visual, video, and targeting manipulation
      // not captured. SPI scores will be understated vs full creative analysis.
      // TODO: Upgrade to screenshot + vision analysis (Option 2) when
      // Claude vision integration is prioritised — likely higher value than
      // text-only and unlocks video/creative manipulation scoring at scale.
      analysis_scope:    'copy_only',

      // BSDetective output
      spi_score:         result.spi_score ?? null,
      the_play:          result.the_play ?? null,
      emotional_targets: result.emotional_targets ?? null,
      blind_spots:       result.blind_spots ?? null,
      the_verdict:       result.the_verdict ?? null,
      raw_output:        result,

      // Tactic vector
      tactic_vector:     buildTacticVector(result.tactics ?? []),

      // Ad-specific metadata stored in raw_output already
      // advertiser_name, search_term, country accessible via raw_output->ad_meta
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
      taxonomy_version: SCAN_VERSION.taxonomy,
    }));

    const { error: tacticError } = await supabase
      .from('crawler_scan_tactics')
      .insert(tacticRows);

    if (tacticError) console.warn('  ⚠️  Tactic insert failed:', tacticError.message);
  }
}

// ─── AD LIBRARY SCRAPER ──────────────────────────────────────────────────────
async function scrapeAds(page, query) {
  const ads = [];

  for (const country of query.countries) {
    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(query.term)}&media_type=all`;

    console.log(`  🌐 Fetching: "${query.term}" | ${country}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000); // let JS render

      // Extract ad cards
      const adCards = await page.$$eval('[data-testid="ad-archive-renderer"], div[class*="adCard"], div[class*="x1dr75xp"]', cards => {
        return cards.slice(0, 5).map(card => {
          // Extract text content — ad body copy
          const textElements = card.querySelectorAll('div[class*="xdj266r"], div[class*="_4bl9"], span[class*="x193iq5w"], p');
          const
            st texts = Array.from(textElements)
            .map(el => el.innerText?.trim())
            .filter(t => t && t.length > 20)
            .join(' ');

          // Extract advertiser name
          const advertiserEl = card.querySelector('a[class*="x1i10hfl"], strong, h4, div[class*="x1heor9g"]');
          const advertiserName = advertiserEl?.innerText?.trim() || 'Unknown Advertiser';

          // Extract start date
          const dateEl = card.querySelector('div[class*="x1lliihq"]');
          const startDate = dateEl?.innerText?.trim() || null;

          return { texts, advertiserName, startDate };
        });
      });

      for (const card of adCards) {
       if (card.texts && card.texts.length >= MIN_CONTENT_LENGTH && !card.texts.includes('AllAfghanistan')) {
          ads.push({
            adText:        card.texts,
            advertiserName: card.advertiserName,
            startDate:     card.startDate,
            country,
            category:      query.category,
            searchTerm:    query.term,
            adUrl:         url,
            contentHash:   hashContent(card.texts),
          });
        }
      }

      console.log(`  ✅ Found ${adCards.length} ad cards for "${query.term}" | ${country}`);

    } catch (err) {
      console.warn(`  ⚠️  Failed to scrape "${query.term}" | ${country}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  return ads;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🕵️  BSDetective Facebook Ad Library Scraper');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔖 ${JSON.stringify(SCAN_VERSION)}`);
  console.log(`🔍 Queries: ${QUERIES.length} | Countries: US, GB | Max ads/query: ${MAX_ADS_PER_QUERY}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const totals = { attempted: 0, scanned: 0, skipped: 0, errors: 0 };

  for (const query of QUERIES) {
    console.log(`\n📋 Query: "${query.term}" [${query.category}]`);

    const ads = await scrapeAds(page, query);
    totals.attempted += ads.length;

    for (const ad of ads.slice(0, MAX_ADS_PER_QUERY)) {
      // Skip duplicates
      if (await isAlreadyScanned(ad.contentHash)) {
        console.log(`  ↩️  Duplicate ad from ${ad.advertiserName}`);
        totals.skipped++;
        continue;
      }

      try {
        console.log(`  🔍 Scanning ad: ${ad.advertiserName} | "${ad.adText.slice(0, 50)}..."`);
        const result = await scanContent(ad.adText, ad.adUrl);
        await storeScan(ad, result);
        console.log(`  ✅ SPI ${result.spi_score ?? '?'} | ${ad.advertiserName} | ${ad.country}`);
        totals.scanned++;

        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
      } catch (err) {
        console.error(`  ❌ Error scanning ad: ${err.message}`);
        totals.errors++;
      }
    }
  }

  await browser.close();

  console.log('\n─────────────────────────────────────');
  console.log('📊 Ad Scraper Run Summary');
  console.log(`  Queries    : ${QUERIES.length}`);
  console.log(`  Attempted  : ${totals.attempted}`);
  console.log(`  Scanned    : ${totals.scanned}`);
  console.log(`  Skipped    : ${totals.skipped}`);
  console.log(`  Errors     : ${totals.errors}`);
  console.log(`  Est. cost  : $${(totals.scanned * 0.006).toFixed(3)}`);
  console.log('─────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
