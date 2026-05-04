/**
 * crawler.js — BSDetective Autonomous Crawler
 * ─────────────────────────────────────────────────────────────────
 * Runs daily via GitHub Actions (split into Batch A and Batch B).
 * Sources: RSS feeds + GDELT 2.0 Doc API (free, no auth required)
 * Output: writes to crawler_queue for analyzer.js to process
 * NO AI calls — that's the analyzer's job.
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const FEED_START            = parseInt(process.env.FEED_START || '0', 10);
const FEED_END              = parseInt(process.env.FEED_END   || '999', 10);

const MAX_ARTICLES_PER_FEED = 3;
const MAX_GDELT_ARTICLES    = 20;
const FETCH_TIMEOUT_MS      = 25000;
const CONTENT_MAX_CHARS     = 8000;
const CONTENT_MIN_CHARS     = 200;
const RUN_BUDGET_MS         = 18 * 60 * 1000; // 18 min hard stop (jobs have 20 min timeout)
const GDELT_QUERY_DELAY_MS  = 5000;

const SCAN_VERSION = {
  analyzer: 'vnext_haiku_2026_03',
  taxonomy: 'v1.0',
  prompt:   'crawler_v1.0',
};

const runStart = Date.now();

// ── RSS Feeds ─────────────────────────────────────────────────────────────────

const ALL_FEEDS = [
  // 0–4: South Africa
  { url: 'https://www.news24.com/rss',             name: 'News24',              domain: 'news24.com',              country: 'ZA',   media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://www.dailymaverick.co.za/feed',   name: 'Daily Maverick',      domain: 'dailymaverick.co.za',     country: 'ZA',   media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://ewn.co.za/RSS',                  name: 'EWN',                 domain: 'ewn.co.za',               country: 'ZA',   media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://www.businessinsider.co.za/feed', name: 'BusinessInsider ZA',  domain: 'businessinsider.co.za',   country: 'ZA',   media_class: 'Business',    topic_class: 'Finance' },
  { url: 'https://www.politicsweb.co.za/rss',      name: 'PoliticsWeb',         domain: 'politicsweb.co.za',       country: 'ZA',   media_class: 'Political',   topic_class: 'Politics' },

  // 5–6: Africa
  { url: 'https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf', name: 'AllAfrica', domain: 'allafrica.com', country: 'INTL', media_class: 'Mainstream', topic_class: 'General' },
  { url: 'https://www.theafricareport.com/feed',   name: 'Africa Report',       domain: 'theafricareport.com',     country: 'INTL', media_class: 'Mainstream',  topic_class: 'General' },

  // 7–9: UK
  { url: 'https://feeds.theguardian.com/theguardian/world/rss', name: 'The Guardian', domain: 'theguardian.com', country: 'GB', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://www.telegraph.co.uk/rss.xml',    name: 'The Telegraph',       domain: 'telegraph.co.uk',         country: 'GB',   media_class: 'Broadsheet',  topic_class: 'General' },
  { url: 'https://www.dailymail.co.uk/articles.rss', name: 'Daily Mail',        domain: 'dailymail.co.uk',         country: 'GB',   media_class: 'Tabloid',     topic_class: 'General' },

  // 10–13: US Mainstream
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', domain: 'nytimes.com', country: 'US', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post',  domain: 'washingtonpost.com',      country: 'US',   media_class: 'Broadsheet',  topic_class: 'General' },
  { url: 'https://moxie.foxnews.com/google-publisher/latest.xml', name: 'Fox News', domain: 'foxnews.com', country: 'US', media_class: 'Cable News', topic_class: 'Politics' },
  { url: 'https://www.breitbart.com/feed',          name: 'Breitbart',           domain: 'breitbart.com',           country: 'US',   media_class: 'Far Right',   topic_class: 'Politics' },

  // 14–17: State Media
  { url: 'https://www.rt.com/rss/',                 name: 'RT',                  domain: 'rt.com',                  country: 'RU',   media_class: 'State Media', topic_class: 'General' },
  { url: 'https://www.globaltimes.cn/rss/outbrain.xml', name: 'Global Times',    domain: 'globaltimes.cn',          country: 'CN',   media_class: 'State Media', topic_class: 'General' },
  { url: 'https://english.aljazeera.net/xml/rss/all.xml', name: 'Al Jazeera',    domain: 'aljazeera.com',           country: 'QA',   media_class: 'State Media', topic_class: 'General' },
  { url: 'https://www.voanews.com/api/zkyiqkemii',  name: 'VOA News',           domain: 'voanews.com',             country: 'US',   media_class: 'State Media', topic_class: 'General' },

  // 18–19: Health / Wellness — high manipulation density
  { url: 'https://www.naturalnews.com/rss.xml',     name: 'Natural News',        domain: 'naturalnews.com',         country: 'US',   media_class: 'Alt Health',  topic_class: 'Health' },
  { url: 'https://childrenshealthdefense.org/feed/', name: "Children's Health Defense", domain: 'childrenshealthdefense.org', country: 'US', media_class: 'Alt Health', topic_class: 'Health' },

  // 20: Finance / Investment
  { url: 'https://www.zerohedge.com/fullrss2.xml',  name: 'ZeroHedge',          domain: 'zerohedge.com',           country: 'US',   media_class: 'Alt Finance', topic_class: 'Finance' },

  // 21–22: International
  { url: 'https://www.dw.com/rss/rss/eng-top.xml',  name: 'DW English',         domain: 'dw.com',                  country: 'DE',   media_class: 'Broadsheet',  topic_class: 'General' },
  { url: 'https://rss.france24.com/rss/en/news',    name: 'France24',           domain: 'france24.com',            country: 'FR',   media_class: 'Mainstream',  topic_class: 'General' },
];

// Slice feeds based on FEED_START/FEED_END env vars (for parallel jobs)
const FEEDS = ALL_FEEDS.slice(FEED_START, FEED_END + 1);

// ── GDELT 2.0 Doc API ────────────────────────────────────────────────────────

const GDELT_QUERIES = [
  { query: '"manipulation" OR "propaganda" OR "disinformation"', theme: 'Manipulation' },
  { query: '"conspiracy" OR "misinformation" OR "fake news"',    theme: 'Disinfo' },
  { query: '"election" OR "voter fraud" OR "stolen election"',   theme: 'Election' },
  { query: '"vaccine" OR "COVID" OR "pandemic" misinformation',  theme: 'Health Disinfo' },
];

async function fetchGDELT(query, maxRecords = 5) {
  const params = new URLSearchParams({
    query,
    mode:       'artlist',
    maxrecords: String(maxRecords),
    format:     'json',
    timespan:   '1d',
    sort:       'hybridrel',
  });

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ── RSS Parsing ───────────────────────────────────────────────────────────────

async function fetchFeed(feedUrl) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(feedUrl, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'BSDetective-Crawler/1.0' },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml    = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);

    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];

    const items = channel.item || channel.entry || [];
    const arr   = Array.isArray(items) ? items : [items];

    return arr.slice(0, MAX_ARTICLES_PER_FEED).map(item => ({
      title: item.title?.['#text'] || item.title || '',
      url:   item.link?.['#text'] || item.link?.['@_href'] || item.link || '',
      published_at: item.pubDate || item.published || item.updated || null,
    })).filter(a => a.url);

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── Article Content Fetching ──────────────────────────────────────────────────

async function fetchArticleContent(url) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BSDetective/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, CONTENT_MAX_CHARS);

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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

// ── Queue Writer ──────────────────────────────────────────────────────────────
// Writes to crawler_queue — analyzer.js handles the AI calls.

async function enqueue(supabase, {
  sourceType, feedMeta, articleUrl, articleDomain, headline,
  publishedAt, content, language,
}) {
  const hash = hashContent(content);

  // Skip if already queued or scanned
  const { data: existingQueue } = await supabase
    .from('crawler_queue')
    .select('id')
    .eq('content_hash', hash)
    .maybeSingle();
  if (existingQueue) return { skipped: true, reason: 'queued' };

  const { data: existingScan } = await supabase
    .from('crawler_scans')
    .select('id')
    .eq('content_hash', hash)
    .maybeSingle();
  if (existingScan) return { skipped: true, reason: 'scanned' };

  const { error } = await supabase
    .from('crawler_queue')
    .insert({
      content_hash:          hash,
      source_type:           sourceType,
      feed_url:              feedMeta?.url || null,
      publisher_name:        feedMeta?.name || articleDomain,
      publisher_domain:      feedMeta?.domain || articleDomain,
      region:                null,
      country:               feedMeta?.country || null,
      media_class:           feedMeta?.media_class || null,
      topic_class:           feedMeta?.topic_class || null,
      article_url:           articleUrl,
      article_domain:        articleDomain,
      headline_text:         headline,
      body_text:             content,
      published_at:          publishedAt || null,
      content_length:        content.length,
      truncated:             content.length >= CONTENT_MAX_CHARS,
      content_extraction_type: 'html_strip',
      language:              language.lang,
      language_confidence:   language.confidence,
      in_distribution:       language.in_distribution,
      status:                'pending',
      queued_at:             new Date().toISOString(),
      analyzer_version:      SCAN_VERSION.analyzer,
      taxonomy_version:      SCAN_VERSION.taxonomy,
      prompt_version:        SCAN_VERSION.prompt,
    });

  if (error) throw new Error(`Queue insert: ${error.message}`);
  return { skipped: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const stats = { queued: 0, skipped: 0, errors: 0 };

  console.log(`\n── RSS Feeds (${FEEDS.length} of ${ALL_FEEDS.length} — index ${FEED_START}–${FEED_END}) ──`);

  // ── Phase 1: RSS Feeds ──────────────────────────────────────────────────────

  for (const feed of FEEDS) {
    if (Date.now() - runStart > RUN_BUDGET_MS) {
      console.log('Run budget reached — stopping gracefully');
      break;
    }

    let articles = [];
    try {
      articles = await fetchFeed(feed.url);
      console.log(`  ${feed.name}: ${articles.length} articles`);
    } catch (err) {
      console.warn(`  ${feed.name}: feed error — ${err.message}`);
      stats.errors++;
      continue;
    }

    for (const article of articles) {
      if (Date.now() - runStart > RUN_BUDGET_MS) break;

      try {
        const content = await fetchArticleContent(article.url);
        if (!content || content.length < CONTENT_MIN_CHARS) continue;

        const domain   = extractDomain(article.url) || feed.domain;
        const language = detectLanguage(content);

        const { skipped } = await enqueue(supabase, {
          sourceType:    'rss_article',
          feedMeta:      feed,
          articleUrl:    article.url,
          articleDomain: domain,
          headline:      article.title,
          publishedAt:   article.published_at,
          content,
          language,
        });

        if (skipped) {
          stats.skipped++;
          console.log(`    ↷ skip duplicate: ${article.title?.slice(0, 60)}`);
        } else {
          stats.queued++;
          console.log(`    ✓ queued [${feed.name}] ${article.title?.slice(0, 60)}`);
        }
      } catch (err) {
        stats.errors++;
        console.warn(`    ✗ ${article.url?.slice(0, 60)}: ${err.message}`);
      }
    }
  }

  // ── Phase 2: GDELT Discovery ────────────────────────────────────────────────
  // Only run GDELT on Batch A (FEED_START === 0) to avoid duplicate queries

  if (FEED_START === 0) {
    console.log(`\n── GDELT Discovery (${GDELT_QUERIES.length} queries) ──`);

    const articlesPerQuery = Math.ceil(MAX_GDELT_ARTICLES / GDELT_QUERIES.length);

    for (const { query, theme } of GDELT_QUERIES) {
      if (Date.now() - runStart > RUN_BUDGET_MS) break;

      const gdeltArticles = await fetchGDELT(query, articlesPerQuery);
      console.log(`  Theme "${theme}": ${gdeltArticles.length} articles from GDELT`);

      for (const ga of gdeltArticles) {
        if (Date.now() - runStart > RUN_BUDGET_MS) break;

        const url    = ga.url;
        const domain = extractDomain(url);
        if (!url || !domain) continue;

        try {
          const content = await fetchArticleContent(url);
          if (!content || content.length < CONTENT_MIN_CHARS) continue;

          const language = detectLanguage(content);

          const { skipped } = await enqueue(supabase, {
            sourceType:    'gdelt_article',
            feedMeta: {
              url:         null,
              name:        ga.domain || domain,
              domain:      domain,
              country:     null,
              media_class: 'GDELT Discovery',
              topic_class: theme,
            },
            articleUrl:    url,
            articleDomain: domain,
            headline:      ga.title || '',
            publishedAt:   ga.seendate || null,
            content,
            language,
          });

          if (skipped) {
            stats.skipped++;
          } else {
            stats.queued++;
            console.log(`    ✓ queued [GDELT/${theme}] ${(ga.title || url).slice(0, 60)}`);
          }
        } catch (err) {
          stats.errors++;
          console.warn(`    ✗ GDELT ${url?.slice(0, 60)}: ${err.message}`);
        }
      }

      // Rate-limit delay between GDELT queries
      await new Promise(r => setTimeout(r, GDELT_QUERY_DELAY_MS));
    }
  } else {
    console.log('\n── GDELT Discovery: skipped (Batch B) ──');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const elapsed = Math.round((Date.now() - runStart) / 1000);

  console.log(`
════════════════════════════════════════
BSDetective Crawler — Run Complete
────────────────────────────────────────
Feed range:  ${FEED_START}–${FEED_END} (${FEEDS.length} feeds)
Queued:      ${stats.queued}
Skipped:     ${stats.skipped} (duplicates)
Errors:      ${stats.errors}
Elapsed:     ${elapsed}s
════════════════════════════════════════
  `);
}

main().catch(err => {
  console.error('Fatal crawler error:', err.message);
  process.exit(1);
});
