import Parser from 'rss-parser';
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

const MAX_ARTICLES_PER_FEED = 3;
const MIN_CONTENT_LENGTH    = 100;
const MAX_CONTENT_LENGTH    = 5000;
const FEED_TIMEOUT_MS       = 15000; // abort slow feeds early

// ─── FEED LIST ───────────────────────────────────────────────────────────────
const FEEDS = [

  // ── South Africa ──────────────────────────────────────────────────────────
  { feed_url: 'https://www.sabcnews.com/sabcnews/feed/', publisher_name: 'SABC News', publisher_domain: 'sabcnews.com', region: 'ZA', country: 'South Africa', media_class: 'digital_native', topic_class: 'general_news' },
  { feed_url: 'https://ewn.co.za/RSS', publisher_name: 'EWN', publisher_domain: 'ewn.co.za', region: 'ZA', country: 'South Africa', media_class: 'digital_native', topic_class: 'general_news' },
  { feed_url: 'https://www.moneyweb.co.za/feed/', publisher_name: 'Moneyweb', publisher_domain: 'moneyweb.co.za', region: 'ZA', country: 'South Africa', media_class: 'digital_native', topic_class: 'business' },
  { feed_url: 'https://feeds.feedburner.com/dailymaverick/opinionista', publisher_name: 'Daily Maverick Opinion', publisher_domain: 'dailymaverick.co.za', region: 'ZA', country: 'South Africa', media_class: 'digital_native', topic_class: 'opinion' },

  // ── Africa ────────────────────────────────────────────────────────────────
  { feed_url: 'https://www.theafricareport.com/feed/', publisher_name: 'The Africa Report', publisher_domain: 'theafricareport.com', region: 'AF', country: 'Pan-Africa', media_class: 'digital_native', topic_class: 'general_news' },
  { feed_url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', publisher_name: 'AllAfrica', publisher_domain: 'allafrica.com', region: 'AF', country: 'Pan-Africa', media_class: 'digital_native', topic_class: 'general_news' },
  { feed_url: 'https://www.premiumtimesng.com/feed/', publisher_name: 'Premium Times Nigeria', publisher_domain: 'premiumtimesng.com', region: 'AF', country: 'Nigeria', media_class: 'digital_native', topic_class: 'politics' },

  // ── UK ────────────────────────────────────────────────────────────────────
  { feed_url: 'https://feeds.theguardian.com/theguardian/politics/rss', publisher_name: 'The Guardian', publisher_domain: 'theguardian.com', region: 'UK', country: 'United Kingdom', media_class: 'broadsheet', topic_class: 'politics' },
  { feed_url: 'https://www.telegraph.co.uk/rss.xml', publisher_name: 'The Telegraph', publisher_domain: 'telegraph.co.uk', region: 'UK', country: 'United Kingdom', media_class: 'broadsheet', topic_class: 'general_news' },
  { feed_url: 'https://www.independent.co.uk/news/uk/politics/rss', publisher_name: 'The Independent', publisher_domain: 'independent.co.uk', region: 'UK', country: 'United Kingdom', media_class: 'tabloid', topic_class: 'politics' },
  { feed_url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', publisher_name: 'BBC News', publisher_domain: 'bbc.co.uk', region: 'UK', country: 'United Kingdom', media_class: 'broadsheet', topic_class: 'politics' },
  { feed_url: 'https://unherd.com/feed/', publisher_name: 'UnHerd', publisher_domain: 'unherd.com', region: 'UK', country: 'United Kingdom', media_class: 'digital_native', topic_class: 'opinion' },

  // ── US ────────────────────────────────────────────────────────────────────
  { feed_url: 'https://feeds.foxnews.com/foxnews/politics', publisher_name: 'Fox News', publisher_domain: 'foxnews.com', region: 'US', country: 'United States', media_class: 'digital_native', topic_class: 'politics' },
  { feed_url: 'https://feeds.npr.org/1014/rss.xml', publisher_name: 'NPR Politics', publisher_domain: 'npr.org', region: 'US', country: 'United States', media_class: 'digital_native', topic_class: 'politics' },
  { feed_url: 'https://www.breitbart.com/feed/', publisher_name: 'Breitbart', publisher_domain: 'breitbart.com', region: 'US', country: 'United States', media_class: 'fringe', topic_class: 'politics' },
  { feed_url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', publisher_name: 'New York Times', publisher_domain: 'nytimes.com', region: 'US', country: 'United States', media_class: 'broadsheet', topic_class: 'politics' },
  { feed_url: 'https://theintercept.com/feed/?rss', publisher_name: 'The Intercept', publisher_domain: 'theintercept.com', region: 'US', country: 'United States', media_class: 'digital_native', topic_class: 'politics' },
  { feed_url: 'https://reason.com/feed/', publisher_name: 'Reason', publisher_domain: 'reason.com', region: 'US', country: 'United States', media_class: 'digital_native', topic_class: 'opinion' },
  { feed_url: 'https://www.motherjones.com/feed/', publisher_name: 'Mother Jones', publisher_domain: 'motherjones.com', region: 'US', country: 'United States', media_class: 'digital_native', topic_class: 'politics' },

  // ── Europe ────────────────────────────────────────────────────────────────
  { feed_url: 'https://www.spiegel.de/international/index.rss', publisher_name: 'Spiegel International', publisher_domain: 'spiegel.de', region: 'EU', country: 'Germany', media_class: 'broadsheet', topic_class: 'general_news' },
  { feed_url: 'https://www.politico.eu/feed/', publisher_name: 'Politico Europe', publisher_domain: 'politico.eu', region: 'EU', country: 'Europe', media_class: 'digital_native', topic_class: 'politics' },

  // ── International / State Media ───────────────────────────────────────────
  { feed_url: 'https://www.rt.com/rss/news/', publisher_name: 'RT', publisher_domain: 'rt.com', region: 'INT', country: 'Russia', media_class: 'state_media', topic_class: 'general_news' },
  { feed_url: 'https://www.aljazeera.com/xml/rss/all.xml', publisher_name: 'Al Jazeera', publisher_domain: 'aljazeera.com', region: 'INT', country: 'Qatar', media_class: 'broadsheet', topic_class: 'general_news' },
  { feed_url: 'https://www.middleeasteye.net/rss', publisher_name: 'Middle East Eye', publisher_domain: 'middleeasteye.net', region: 'INT', country: 'United Kingdom', media_class: 'digital_native', topic_class: 'general_news' },
  { feed_url: 'https://www.france24.com/en/rss', publisher_name: 'France 24', publisher_domain: 'france24.com', region: 'INT', country: 'France', media_class: 'broadsheet', topic_class: 'general_news' },
  { feed_url: 'https://www.scmp.com/rss/91/feed', publisher_name: 'South China Morning Post', publisher_domain: 'scmp.com', region: 'INT', country: 'Hong Kong', media_class: 'broadsheet', topic_class: 'general_news' },

  // ── Advertorial / Business Media ──────────────────────────────────────────
  { feed_url: 'https://www.entrepreneur.com/latest.rss', publisher_name: 'Entrepreneur', publisher_domain: 'entrepreneur.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'business' },
  { feed_url: 'https://www.inc.com/rss', publisher_name: 'Inc.', publisher_domain: 'inc.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'business' },
  { feed_url: 'https://www.fastcompany.com/latest/rss', publisher_name: 'Fast Company', publisher_domain: 'fastcompany.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'business' },
  { feed_url: 'https://www.forbes.com/real-time/feed2/', publisher_name: 'Forbes', publisher_domain: 'forbes.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'business' },
  { feed_url: 'https://feeds.businessinsider.com/custom/all', publisher_name: 'Business Insider', publisher_domain: 'businessinsider.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'business' },

  // ── Health & Lifestyle ────────────────────────────────────────────────────
  { feed_url: 'https://www.menshealth.com/rss/all.xml/', publisher_name: "Men's Health", publisher_domain: 'menshealth.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'health_wellness' },
  { feed_url: 'https://www.womenshealthmag.com/rss/all.xml/', publisher_name: "Women's Health", publisher_domain: 'womenshealthmag.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'health_wellness' },
  { feed_url: 'https://www.prevention.com/rss/all.xml/', publisher_name: 'Prevention', publisher_domain: 'prevention.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'health_wellness' },
  { feed_url: 'https://www.healthline.com/rss/health-news', publisher_name: 'Healthline', publisher_domain: 'healthline.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'health_wellness' },
  { feed_url: 'https://www.mindbodygreen.com/rss.xml', publisher_name: 'MindBodyGreen', publisher_domain: 'mindbodygreen.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'health_wellness' },

  // ── Self-Improvement ──────────────────────────────────────────────────────
  { feed_url: 'https://www.tonyrobbins.com/feed/', publisher_name: 'Tony Robbins', publisher_domain: 'tonyrobbins.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'self_improvement' },
  { feed_url: 'https://www.mindvalley.com/blog/feed', publisher_name: 'Mindvalley', publisher_domain: 'mindvalley.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'self_improvement' },
  { feed_url: 'https://www.iwillteachyoutoberich.com/feed/', publisher_name: 'I Will Teach You To Be Rich', publisher_domain: 'iwillteachyoutoberich.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'self_improvement' },
  { feed_url: 'https://foundr.com/feed', publisher_name: 'Foundr', publisher_domain: 'foundr.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'self_improvement' },

  // ── Charities & NGOs ──────────────────────────────────────────────────────
  { feed_url: 'https://www.wwf.org.uk/rss.xml', publisher_name: 'WWF UK', publisher_domain: 'wwf.org.uk', region: 'UK', country: 'United Kingdom', media_class: 'charity', topic_class: 'general_news' },
  { feed_url: 'https://www.greenpeace.org/international/feed/', publisher_name: 'Greenpeace International', publisher_domain: 'greenpeace.org', region: 'INT', country: 'International', media_class: 'charity', topic_class: 'general_news' },
  { feed_url: 'https://www.oxfam.org/en/rss.xml', publisher_name: 'Oxfam', publisher_domain: 'oxfam.org', region: 'INT', country: 'United Kingdom', media_class: 'charity', topic_class: 'general_news' },
  { feed_url: 'https://www.amnesty.org/en/feed/', publisher_name: 'Amnesty International', publisher_domain: 'amnesty.org', region: 'INT', country: 'International', media_class: 'charity', topic_class: 'general_news' },

  // ── Government & Public Health ────────────────────────────────────────────
  { feed_url: 'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml', publisher_name: 'World Health Organization', publisher_domain: 'who.int', region: 'INT', country: 'International', media_class: 'government', topic_class: 'health_wellness' },
  { feed_url: 'https://www.nhs.uk/news/rss.aspx', publisher_name: 'NHS', publisher_domain: 'nhs.uk', region: 'UK', country: 'United Kingdom', media_class: 'government', topic_class: 'health_wellness' },
  { feed_url: 'https://www.gov.za/rss.xml', publisher_name: 'South African Government', publisher_domain: 'gov.za', region: 'ZA', country: 'South Africa', media_class: 'government', topic_class: 'politics' },

  // ── Higher Education ──────────────────────────────────────────────────────
  { feed_url: 'https://news.harvard.edu/gazette/feed/', publisher_name: 'Harvard Gazette', publisher_domain: 'harvard.edu', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'higher_education' },
  { feed_url: 'https://www.wbs.ac.uk/news/feed/', publisher_name: 'Warwick Business School', publisher_domain: 'wbs.ac.uk', region: 'UK', country: 'United Kingdom', media_class: 'advertorial', topic_class: 'higher_education' },
  { feed_url: 'https://poetsandquants.com/feed/', publisher_name: 'Poets & Quants', publisher_domain: 'poetsandquants.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'higher_education' },

  // ── Recruitment ───────────────────────────────────────────────────────────
  { feed_url: 'https://www.glassdoor.com/blog/feed/', publisher_name: 'Glassdoor Blog', publisher_domain: 'glassdoor.com', region: 'US', country: 'United States', media_class: 'recruitment', topic_class: 'hr_recruitment' },

  // ── Real Estate ───────────────────────────────────────────────────────────
  { feed_url: 'https://www.privateproperty.co.za/rss/news', publisher_name: 'Private Property ZA', publisher_domain: 'privateproperty.co.za', region: 'ZA', country: 'South Africa', media_class: 'advertorial', topic_class: 'real_estate' },
  { feed_url: 'https://www.property24.com/rss/articles', publisher_name: 'Property24', publisher_domain: 'property24.com', region: 'ZA', country: 'South Africa', media_class: 'advertorial', topic_class: 'real_estate' },
  { feed_url: 'https://www.zillow.com/blog/feed/', publisher_name: 'Zillow Blog', publisher_domain: 'zillow.com', region: 'US', country: 'United States', media_class: 'advertorial', topic_class: 'real_estate' },

  // ── Financial Services ────────────────────────────────────────────────────
  { feed_url: 'https://www.debt.com/blog/feed/', publisher_name: 'Debt.com', publisher_domain: 'debt.com', region: 'US', country: 'United States', media_class: 'health_commercial', topic_class: 'business' },
];

// ─── LANGUAGE DETECTION ──────────────────────────────────────────────────────
function detectLanguage(text) {
  const sample = text.slice(0, 500).toLowerCase();
  const afrikaans = ['die ', 'van ', 'het ', 'wat ', 'nie ', 'dat ', 'met ', 'vir '];
  const french    = [' les ', ' des ', ' une ', ' que ', ' est ', ' par '];
  const arabic    = ['\u0627\u0644', '\u0645\u0646', '\u0625\u0644\u0649'];
  const score = (signals) => signals.filter(s => sample.includes(s)).length;
  if (score(arabic) >= 2)    return { lang: 'ar', confidence: 'heuristic', in_distribution: false };
  if (score(afrikaans) >= 3) return { lang: 'af', confidence: 'heuristic', in_distribution: false };
  if (score(french) >= 3)    return { lang: 'fr', confidence: 'heuristic', in_distribution: false };
  return { lang: 'en', confidence: 'heuristic', in_distribution: true };
}

// ─── INIT ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const parser   = new Parser({
  timeout: FEED_TIMEOUT_MS,
  headers: { 'User-Agent': 'BSDetective-Crawler/1.0' },
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function extractContent(item) {
  const sources = [
    { key: 'content:encoded', value: item['content:encoded'], type: 'full_content_encoded' },
    { key: 'content',         value: item.content,            type: 'content'              },
    { key: 'contentSnippet',  value: item.contentSnippet,     type: 'snippet'              },
    { key: 'summary',         value: item.summary,            type: 'summary'              },
    { key: 'title',           value: item.title,              type: 'title_only'           },
  ];
  for (const source of sources) {
    if (source.value && source.value.trim().length > 0) {
      const clean = source.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return { text: clean, extraction_type: source.type };
    }
  }
  return { text: '', extraction_type: 'none' };
}

function truncateContent(text, maxLen) {
  if (text.length <= maxLen) return { text, truncated: false };
  return { text: text.slice(0, maxLen) + '...', truncated: true };
}

async function isAlreadyQueued(contentHash) {
  // Check both queue and existing scans to avoid re-queueing already-processed content
  const [queueCheck, scanCheck] = await Promise.all([
    supabase.from('crawler_queue').select('id').eq('content_hash', contentHash).maybeSingle(),
    supabase.from('crawler_scans').select('id').eq('content_hash', contentHash).maybeSingle(),
  ]);
  return !!(queueCheck.data || scanCheck.data);
}

async function addToQueue(item) {
  const { error } = await supabase.from('crawler_queue').insert(item);
  if (error && error.code !== '23505') { // ignore unique constraint violations (race condition safe)
    throw error;
  }
}

// ─── FEED PROCESSOR ──────────────────────────────────────────────────────────
async function processFeed(feedConfig) {
  console.log(`📡 ${feedConfig.publisher_name} (${feedConfig.region})`);

  let feed;
  try {
    // Per-feed timeout wrapper — prevents one slow feed hanging the batch
    const feedPromise = parser.parseURL(feedConfig.feed_url);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Feed timeout')), FEED_TIMEOUT_MS + 2000)
    );
    feed = await Promise.race([feedPromise, timeoutPromise]);
  } catch (err) {
    console.warn(`  ⚠️  Feed failed: ${err.message}`);
    return { queued: 0, skipped: 0, errors: 1 };
  }

  const items = feed.items.slice(0, MAX_ARTICLES_PER_FEED);
  let queued = 0, skipped = 0, errors = 0;

  for (const item of items) {
    const { text: rawText, extraction_type } = extractContent(item);

    if (rawText.length < MIN_CONTENT_LENGTH) {
      skipped++;
      continue;
    }

    const contentHash = hashContent(rawText);

    if (await isAlreadyQueued(contentHash)) {
      console.log(`  ↩️  Already exists: ${item.title?.slice(0, 50)}`);
      skipped++;
      continue;
    }

    const { text: finalText, truncated } = truncateContent(rawText, MAX_CONTENT_LENGTH);
    const langResult = detectLanguage(finalText);

    try {
      await addToQueue({
        content_hash:             contentHash,
        source_type:              'rss',
        feed_url:                 feedConfig.feed_url,
        publisher_name:           feedConfig.publisher_name,
        publisher_domain:         feedConfig.publisher_domain,
        region:                   feedConfig.region,
        country:                  feedConfig.country,
        media_class:              feedConfig.media_class,
        topic_class:              feedConfig.topic_class,
        article_url:              item.link || item.guid || '',
        article_domain:           (() => { try { return new URL(item.link || feedConfig.feed_url).hostname; } catch { return feedConfig.publisher_domain; } })(),
        headline_text:            item.title || '',
        body_text:                finalText,
        published_at:             item.pubDate || item.isoDate || null,
        content_length:           rawText.length,
        truncated,
        content_extraction_type:  extraction_type,
        language:                 langResult.lang,
        language_confidence:      langResult.confidence,
        in_distribution:          langResult.in_distribution,
        status:                   'pending',
        analyzer_version:         SCAN_VERSION.analyzer,
        taxonomy_version:         SCAN_VERSION.taxonomy,
        prompt_version:           SCAN_VERSION.prompt,
      });

      console.log(`  ✅ Queued: ${item.title?.slice(0, 55)}`);
      queued++;
    } catch (err) {
      console.error(`  ❌ Queue insert failed: ${err.message}`);
      errors++;
    }
  }

  return { queued, skipped, errors };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🕵️  BSDetective RSS Crawler (queue mode)');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`📰 Feeds: ${FEEDS.length} | Max per feed: ${MAX_ARTICLES_PER_FEED}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const totals = { queued: 0, skipped: 0, errors: 0 };

  // Process feeds in parallel batches of 10 — safe now because there are no AI calls
  const BATCH_SIZE = 10;
  for (let i = 0; i < FEEDS.length; i += BATCH_SIZE) {
    const batch = FEEDS.slice(i, i + BATCH_SIZE);
    console.log(`\n── Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(FEEDS.length / BATCH_SIZE)} ──`);
    const results = await Promise.all(batch.map(processFeed));
    results.forEach(r => {
      totals.queued  += r.queued;
      totals.skipped += r.skipped;
      totals.errors  += r.errors;
    });
  }

  console.log('\n─────────────────────────────────────');
  console.log('📊 Crawl Summary (no AI calls — fast by design)');
  console.log(`  Feeds      : ${FEEDS.length}`);
  console.log(`  Queued     : ${totals.queued}`);
  console.log(`  Skipped    : ${totals.skipped}`);
  console.log(`  Errors     : ${totals.errors}`);
  console.log(`  AI cost    : $0.000 (analyze job handles this separately)`);
  console.log('─────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
