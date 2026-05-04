/**
 * crawler.js — BSDetective Autonomous Crawler
 * ─────────────────────────────────────────────────────────────────
 * Runs daily via GitHub Actions.
 * Sources: RSS feeds + GDELT 2.0 Doc API (free, no auth required)
 * Enrichment: MBFC credibility lookup per domain
 * Output: crawler_scans + crawler_scan_tactics tables in Supabase
 * ─────────────────────────────────────────────────────────────────
 */

const { createClient } = require('@supabase/supabase-js');
const { XMLParser }    = require('fast-xml-parser');
const crypto           = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EDGE_FUNCTION_URL    = `${SUPABASE_URL}/functions/v1/analyze-vnext`;

const MAX_ARTICLES_PER_FEED  = 3;
const MAX_GDELT_ARTICLES     = 20;   // extra articles from GDELT per run
const FETCH_TIMEOUT_MS       = 25000;
const CONTENT_MAX_CHARS      = 8000;
const RUN_BUDGET_MS          = 23 * 60 * 1000; // 23 min hard stop

const runStart = Date.now();

// ── RSS Feeds ─────────────────────────────────────────────────────────────────

const FEEDS = [
  // South Africa
  { url: 'https://www.news24.com/rss',             name: 'News24',           domain: 'news24.com',           country: 'ZA', media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://www.dailymaverick.co.za/feed',   name: 'Daily Maverick',   domain: 'dailymaverick.co.za',  country: 'ZA', media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://ewn.co.za/RSS',                  name: 'EWN',              domain: 'ewn.co.za',            country: 'ZA', media_class: 'Mainstream',  topic_class: 'General' },
  { url: 'https://www.businessinsider.co.za/feed', name: 'BusinessInsider ZA', domain: 'businessinsider.co.za', country: 'ZA', media_class: 'Business', topic_class: 'Finance' },
  { url: 'https://www.politicsweb.co.za/rss',      name: 'PoliticsWeb',      domain: 'politicsweb.co.za',    country: 'ZA', media_class: 'Political',   topic_class: 'Politics' },

  // Africa
  { url: 'https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf', name: 'AllAfrica', domain: 'allafrica.com', country: 'INTL', media_class: 'Mainstream', topic_class: 'General' },
  { url: 'https://www.theafricareport.com/feed',   name: 'Africa Report',    domain: 'theafricareport.com',  country: 'INTL', media_class: 'Mainstream', topic_class: 'General' },

  // UK
  { url: 'https://feeds.theguardian.com/theguardian/world/rss', name: 'The Guardian', domain: 'theguardian.com', country: 'GB', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://www.telegraph.co.uk/rss.xml',   name: 'The Telegraph',    domain: 'telegraph.co.uk',      country: 'GB', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://www.dailymail.co.uk/articles.rss', name: 'Daily Mail',    domain: 'dailymail.co.uk',      country: 'GB', media_class: 'Tabloid',    topic_class: 'General' },

  // US Mainstream
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', domain: 'nytimes.com', country: 'US', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post', domain: 'washingtonpost.com', country: 'US', media_class: 'Broadsheet', topic_class: 'General' },
  { url: 'https://moxie.foxnews.com/google-publisher/latest.xml', name: 'Fox News', domain: 'foxnews.com', country: 'US', media_class: 'Cable News', topic_class: 'Politics' },
  { url: 'https://www.breitbart.com/feed', name: 'Breitbart',              domain: 'breitbart.com',        country: 'US', media_class: 'Far Right',   topic_class: 'Politics' },

  // State Media
  { url: 'https://www.rt.com/rss/',                name: 'RT',               domain: 'rt.com',               country: 'RU', media_class: 'State Media', topic_class: 'General' },
  { url: 'https://www.globaltimes.cn/rss/outbrain.xml', name: 'Global Times', domain: 'globaltimes.cn',     country: 'CN', media_class: 'State Media', topic_class: 'General' },
  { url: 'https://english.aljazeera.net/xml/rss/all.xml', name: 'Al Jazeera', domain: 'aljazeera.com',     country: 'QA', media_class: 'State Media', topic_class: 'General' },
  { url: 'https://www.voanews.com/api/zkyiqkemii',  name: 'VOA News',        domain: 'voanews.com',          country: 'US', media_class: 'State Media', topic_class: 'General' },

  // Health / Wellness — high manipulation density
  { url: 'https://www.naturalnews.com/rss.xml',    name: 'Natural News',     domain: 'naturalnews.com',      country: 'US', media_class: 'Alt Health',  topic_class: 'Health' },
  { url: 'https://childrenshealthdefense.org/feed/', name: "Children's Health Defense", domain: 'childrenshealthdefense.org', country: 'US', media_class: 'Alt Health', topic_class: 'Health' },

  // Finance / Investment
  { url: 'https://www.zerohedge.com/fullrss2.xml', name: 'ZeroHedge',        domain: 'zerohedge.com',        country: 'US', media_class: 'Alt Finance', topic_class: 'Finance' },

  // International
  { url: 'https://www.dw.com/rss/rss/eng-top.xml', name: 'DW English',      domain: 'dw.com',               country: 'DE', media_class: 'Broadsheet',  topic_class: 'General' },
  { url: 'https://rss.france24.com/rss/en/news',   name: 'France24',        domain: 'france24.com',         country: 'FR', media_class: 'Mainstream',   topic_class: 'General' },
];

// ── GDELT 2.0 Doc API ─────────────────────────────────────────────────────────
// Surfaces high-traction articles we might miss from RSS
// Returns articles sorted by GDELT's own relevance + tone signal
// Free, no API key, global coverage

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
    timespan:   '1d',    // last 24 hours only
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

    // Lightweight extraction — strip tags, collapse whitespace
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

// ── Scan via Edge Function ────────────────────────────────────────────────────

async function scanContent(text, url) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey':        SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        text,
        url,
        scan_source: 'crawler',
        force_model: 'haiku',
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Edge function HTTP ${res.status}`);
    return await res.json();

  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── Domain Utilities ──────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function contentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ── MBFC Lookup ───────────────────────────────────────────────────────────────
// Pull enrichment for a domain from the domain_enrichment table
// Returns null if not found — never blocks a scan

async function getMBFC(supabase, domain) {
  if (!domain) return null;
  try {
    const { data } = await supabase
      .from('domain_enrichment')
      .select('mbfc_bias, mbfc_factuality, mbfc_credibility')
      .eq('domain', domain)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

// ── Persist to Supabase ───────────────────────────────────────────────────────

async function persistScan(supabase, {
  feedMeta, article, content, result, gdeltTone, gdeltSource, mbfc,
}) {
  const hash   = contentHash(content);
  const domain = feedMeta?.domain || extractDomain(article.url);

  // Check duplicate
  const { data: existing } = await supabase
    .from('crawler_scans')
    .select('id')
    .eq('content_hash', hash)
    .maybeSingle();

  if (existing) return { skipped: true };

  const tactics = result?.tactics || [];

  // Insert scan row
  const { data: scan, error: scanErr } = await supabase
    .from('crawler_scans')
    .insert({
      article_url:     article.url,
      article_domain:  domain,
      publisher_name:  feedMeta?.name || domain,
      article_title:   article.title || null,
      article_published_at: article.published_at || null,
      country:         feedMeta?.country || null,
      media_class:     feedMeta?.media_class || null,
      topic_class:     feedMeta?.topic_class || null,
      feed_name:       feedMeta?.name || 'gdelt',
      content_hash:    hash,
      content_length_chars: content.length,
      truncated:       content.length >= CONTENT_MAX_CHARS,
      scan_source:     'crawler',
      scan_status:     'success',

      // BSDetective output
      spi_score:       result?.spi_score        ?? null,
      the_play:        result?.the_play         ?? null,
      emotional_targets: result?.emotional_targets ?? null,
      blind_spots:     result?.blind_spots      ?? null,
      the_verdict:     result?.the_verdict      ?? null,
      raw_output:      result,

      // GDELT enrichment
      gdelt_tone:   gdeltTone  ?? null,
      gdelt_source: gdeltSource ?? false,

      // MBFC enrichment
      mbfc_bias:        mbfc?.mbfc_bias        ?? null,
      mbfc_factuality:  mbfc?.mbfc_factuality  ?? null,
      mbfc_credibility: mbfc?.mbfc_credibility ?? null,

      // Versions
      analyzer_version: '1.0',
      taxonomy_version: '1.0',
      prompt_version:   '1.0',
    })
    .select('id')
    .single();

  if (scanErr) throw new Error(`Scan insert error: ${scanErr.message}`);

  // Insert tactics
  if (tactics.length > 0) {
    const tacticRows = tactics.map(t => ({
      scan_id:          scan.id,
      tactic_code:      t.code  || null,
      tactic_label:     t.label || t.name || t,
      severity:         t.severity || null,
      evidence_excerpt: t.evidence || null,
      taxonomy_version: '1.0',
    }));

    const { error: tacticErr } = await supabase
      .from('crawler_scan_tactics')
      .insert(tacticRows);

    if (tacticErr) console.warn(`Tactic insert warning: ${tacticErr.message}`);
  }

  return { skipped: false, scanId: scan.id, spiScore: result?.spi_score };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const stats = { rss: 0, gdelt: 0, skipped: 0, errors: 0, scanned: 0 };

  // ── Phase 1: RSS Feeds ──────────────────────────────────────────────────────

  console.log(`\n── RSS Feeds (${FEEDS.length} sources) ──`);

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
        if (!content || content.length < 200) continue;

        const result = await scanContent(content, article.url);
        const mbfc   = await getMBFC(supabase, feed.domain);

        const { skipped } = await persistScan(supabase, {
          feedMeta: feed,
          article,
          content,
          result,
          gdeltTone: null,
          gdeltSource: false,
          mbfc,
        });

        if (skipped) {
          stats.skipped++;
          console.log(`    ↷ skip duplicate: ${article.title?.slice(0, 60)}`);
        } else {
          stats.rss++;
          stats.scanned++;
          console.log(`    ✓ SPI ${result?.spi_score ?? '?'} [${feed.name}] ${article.title?.slice(0, 60)}`);
        }
      } catch (err) {
        stats.errors++;
        console.warn(`    ✗ ${article.url?.slice(0, 60)}: ${err.message}`);
      }
    }
  }

  // ── Phase 2: GDELT Discovery ────────────────────────────────────────────────
  // Surfaces high-traction articles on manipulation-adjacent themes
  // that RSS feeds might miss

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
        if (!content || content.length < 200) continue;

        const result = await scanContent(content, url);
        const mbfc   = await getMBFC(supabase, domain);

        const { skipped } = await persistScan(supabase, {
          feedMeta: {
            name:        ga.domain || domain,
            domain:      domain,
            country:     ga.language === 'Russian' ? 'RU' : null,
            media_class: 'GDELT Discovery',
            topic_class: theme,
          },
          article: {
            url,
            title:        ga.title || '',
            published_at: ga.seendate || null,
          },
          content,
          result,
          gdeltTone:   typeof ga.tone === 'number' ? ga.tone : null,
          gdeltSource: true,
          mbfc,
        });

        if (skipped) {
          stats.skipped++;
        } else {
          stats.gdelt++;
          stats.scanned++;
          console.log(`    ✓ SPI ${result?.spi_score ?? '?'} [GDELT/${theme}] ${(ga.title || url).slice(0, 60)}`);
        }
      } catch (err) {
        stats.errors++;
        console.warn(`    ✗ GDELT ${url?.slice(0, 60)}: ${err.message}`);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const elapsed = Math.round((Date.now() - runStart) / 1000);

  console.log(`
════════════════════════════════════════
BSDetective Crawler — Run Complete
────────────────────────────────────────
RSS scans:     ${stats.rss}
GDELT scans:   ${stats.gdelt}
Total scanned: ${stats.scanned}
Skipped:       ${stats.skipped} (duplicates)
Errors:        ${stats.errors}
Elapsed:       ${elapsed}s
════════════════════════════════════════
  `);
}

main().catch(err => {
  console.error('Fatal crawler error:', err.message);
  process.exit(1);
});
