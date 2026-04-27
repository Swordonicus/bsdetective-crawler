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

const MAX_ADS_PER_QUERY  = 5;
const REQUEST_DELAY_MS   = 2000;
const MIN_CONTENT_LENGTH = 50;

// ─── SEARCH QUERIES ──────────────────────────────────────────────────────────
const QUERIES = [
  { term: 'weight loss supplement', countries: ['US', 'GB'], category: 'health_commercial' },
  { term: 'financial freedom',      countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'work from home',         countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'debt relief',            countries: ['US', 'GB'], category: 'financial_services'},
  { term: 'make money online',      countries: ['US', 'GB'], category: 'self_improvement'  },
  { term: 'limited time offer',     countries: ['US', 'GB'], category: 'ecommerce'         },
  { term: 'anti-aging',             countries: ['US', 'GB'], category: 'health_commercial' },
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

async function isAlreadyQueued(contentHash) {
  const [queueCheck, scanCheck] = await Promise.all([
    supabase.from('crawler_queue').select('id').eq('content_hash', contentHash).maybeSingle(),
    supabase.from('crawler_scans').select('id').eq('content_hash', contentHash).maybeSingle(),
  ]);
  return !!(queueCheck.data || scanCheck.data);
}

async function addToQueue(ad) {
  const { error } = await supabase.from('crawler_queue').insert({
    content_hash:            ad.contentHash,
    source_type:             'facebook_ad',
    feed_url:                ad.adUrl,
    publisher_name:          ad.advertiserName,
    publisher_domain:        ad.advertiserName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    region:                  ad.country === 'US' ? 'US' : 'UK',
    country:                 ad.country === 'US' ? 'United States' : 'United Kingdom',
    media_class:             'facebook_ad',
    topic_class:             ad.category,
    article_url:             ad.adUrl,
    article_domain:          'facebook.com',
    headline_text:           ad.adText.slice(0, 200),
    body_text:               ad.adText,
    content_length:          ad.adText.length,
    truncated:               false,
    content_extraction_type: 'facebook_ad_body',
    language:                'en',
    language_confidence:     'assumed',
    in_distribution:         true,
    advertiser_name:         ad.advertiserName,
    search_term:             ad.searchTerm,
    ad_country:              ad.country,
    status:                  'pending',
    analyzer_version:        SCAN_VERSION.analyzer,
    taxonomy_version:        SCAN_VERSION.taxonomy,
    prompt_version:          SCAN_VERSION.prompt,
  });
  if (error && error.code !== '23505') throw error;
}

// ─── AD LIBRARY SCRAPER ──────────────────────────────────────────────────────
// NOTE: Facebook randomises CSS class names on every deploy.
// The selectors below use a multi-strategy approach to maximise resilience.
// If hit rate drops to zero, check the Ad Library HTML structure and update
// the selectors — this is expected maintenance, not a bug.
async function scrapeAds(page, query) {
  const ads = [];

  for (const country of query.countries) {
    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(query.term)}&media_type=all`;

    console.log(`  🌐 "${query.term}" | ${country}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Multi-strategy text extraction — resilient to class name changes
      const adData = await page.evaluate((minLen) => {
        const results = [];

        // Strategy 1: look for ad archive renderer containers (most stable)
        const containers = document.querySelectorAll(
          '[data-testid="ad-archive-renderer"], [aria-label*="Ad by"], div[role="article"]'
        );

        containers.forEach(container => {
          // Get all text nodes with meaningful content
          const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
          const texts = [];
          let node;
          while ((node = walker.nextNode())) {
            const text = node.textContent?.trim();
            if (text && text.length > 20 && !text.match(/^\d+:\d+/) && !text.includes('Sponsored')) {
              texts.push(text);
            }
          }
          const combined = texts.join(' ').trim();

          // Get advertiser name from link or heading near the top
          const nameEl = container.querySelector('a[href*="facebook.com"], h2, h3, strong');
          const advertiserName = nameEl?.textContent?.trim() || 'Unknown Advertiser';

          if (combined.length >= minLen) {
            results.push({ texts: combined, advertiserName });
          }
        });

        // Strategy 2: fallback — grab any large text blocks if no containers found
        if (results.length === 0) {
          const textBlocks = document.querySelectorAll('div[style*="direction"], div[lang]');
          textBlocks.forEach(el => {
            const text = el.innerText?.trim();
            if (text && text.length >= minLen && !text.includes('Log in') && !text.includes('Facebook')) {
              results.push({ texts: text, advertiserName: 'Unknown Advertiser' });
            }
          });
        }

        return results.slice(0, 5);
      }, MIN_CONTENT_LENGTH);

      for (const card of adData) {
        ads.push({
          adText:         card.texts,
          advertiserName: card.advertiserName,
          country,
          category:       query.category,
          searchTerm:     query.term,
          adUrl:          url,
          contentHash:    hashContent(card.texts),
        });
      }

      console.log(`  ✅ Extracted ${adData.length} ads`);

    } catch (err) {
      console.warn(`  ⚠️  Scrape failed "${query.term}" | ${country}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  return ads;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🕵️  BSDetective Facebook Ad Scraper (queue mode)');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔍 Queries: ${QUERIES.length}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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
  const totals = { found: 0, queued: 0, skipped: 0, errors: 0 };

  for (const query of QUERIES) {
    console.log(`\n📋 "${query.term}" [${query.category}]`);
    const ads = await scrapeAds(page, query);
    totals.found += ads.length;

    for (const ad of ads.slice(0, MAX_ADS_PER_QUERY)) {
      if (await isAlreadyQueued(ad.contentHash)) {
        console.log(`  ↩️  Duplicate: ${ad.advertiserName}`);
        totals.skipped++;
        continue;
      }

      try {
        await addToQueue(ad);
        console.log(`  ✅ Queued: ${ad.advertiserName} | "${ad.adText.slice(0, 50)}..."`);
        totals.queued++;
      } catch (err) {
        console.error(`  ❌ Queue failed: ${err.message}`);
        totals.errors++;
      }
    }
  }

  await browser.close();

  console.log('\n─────────────────────────────────────');
  console.log('📊 Ad Scraper Summary (queue mode)');
  console.log(`  Queries    : ${QUERIES.length}`);
  console.log(`  Ads found  : ${totals.found}`);
  console.log(`  Queued     : ${totals.queued}`);
  console.log(`  Skipped    : ${totals.skipped}`);
  console.log(`  Errors     : ${totals.errors}`);
  console.log(`  AI cost    : $0.000 (analyzer handles this)`);
  console.log('─────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
