import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── VERSION CONTROL ────────────────────────────────────────────────────────
// Bump these when taxonomy or prompt changes — critical for dataset integrity
const SCAN_VERSION = {
  analyzer:  'vnext_haiku_2026_03',
  taxonomy:  'v1.0',
  prompt:    'crawler_v1.0',
};

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const ANALYZE_URL           = `${SUPABASE_URL}/functions/v1/analyze-vnext`;

const MAX_ARTICLES_PER_FEED = 3;
const MIN_CONTENT_LENGTH    = 100;
const MAX_CONTENT_LENGTH    = 5000;
const REQUEST_DELAY_MS      = 1200;

// ─── FEED LIST ───────────────────────────────────────────────────────────────
// media_class: broadsheet | tabloid | digital_native | state_media | fringe |
//              advertorial | charity | government | health_commercial | recruitment
// topic_class: politics | general_news | business | opinion |
//              health_wellness | lifestyle | self_improvement |
//              real_estate | higher_education | hr_recruitment
const FEEDS = [

  // ── South Africa ──────────────────────────────────────────────────────────
  {
    feed_url: 'https://www.sabcnews.com/sabcnews/feed/',
    publisher_name: 'SABC News', publisher_domain: 'sabcnews.com',
    region: 'ZA', country: 'South Africa',
    media_class: 'digital_native', topic_class: 'general_news',
  },
  {
    feed_url: 'https://ewn.co.za/RSS',
    publisher_name: 'EWN', publisher_domain: 'ewn.co.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'digital_native', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.moneyweb.co.za/feed/',
    publisher_name: 'Moneyweb', publisher_domain: 'moneyweb.co.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'digital_native', topic_class: 'business',
  },
  {
    feed_url: 'https://feeds.feedburner.com/dailymaverick/opinionista',
    publisher_name: 'Daily Maverick Opinion', publisher_domain: 'dailymaverick.co.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'digital_native', topic_class: 'opinion',
  },

  // ── Africa (Continental) ──────────────────────────────────────────────────
  {
    feed_url: 'https://www.theafricareport.com/feed/',
    publisher_name: 'The Africa Report', publisher_domain: 'theafricareport.com',
    region: 'AF', country: 'Pan-Africa',
    media_class: 'digital_native', topic_class: 'general_news',
  },
  {
    feed_url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
    publisher_name: 'AllAfrica', publisher_domain: 'allafrica.com',
    region: 'AF', country: 'Pan-Africa',
    media_class: 'digital_native', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.premiumtimesng.com/feed/',
    publisher_name: 'Premium Times Nigeria', publisher_domain: 'premiumtimesng.com',
    region: 'AF', country: 'Nigeria',
    media_class: 'digital_native', topic_class: 'politics',
  },

  // ── UK ────────────────────────────────────────────────────────────────────
  {
    feed_url: 'https://feeds.theguardian.com/theguardian/politics/rss',
    publisher_name: 'The Guardian', publisher_domain: 'theguardian.com',
    region: 'UK', country: 'United Kingdom',
    media_class: 'broadsheet', topic_class: 'politics',
  },
  {
    feed_url: 'https://www.telegraph.co.uk/rss.xml',
    publisher_name: 'The Telegraph', publisher_domain: 'telegraph.co.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'broadsheet', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.mirror.co.uk/news/politics/?service=rss',
    publisher_name: 'Daily Mirror', publisher_domain: 'mirror.co.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'tabloid', topic_class: 'politics',
  },
  {
    feed_url: 'https://www.independent.co.uk/news/uk/politics/rss',
    publisher_name: 'The Independent', publisher_domain: 'independent.co.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'tabloid', topic_class: 'politics',
  },
  {
    feed_url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',
    publisher_name: 'BBC News', publisher_domain: 'bbc.co.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'broadsheet', topic_class: 'politics',
  },
  {
    feed_url: 'https://unherd.com/feed/',
    publisher_name: 'UnHerd', publisher_domain: 'unherd.com',
    region: 'UK', country: 'United Kingdom',
    media_class: 'digital_native', topic_class: 'opinion',
  },

  // ── US ────────────────────────────────────────────────────────────────────
  {
    feed_url: 'https://feeds.foxnews.com/foxnews/politics',
    publisher_name: 'Fox News', publisher_domain: 'foxnews.com',
    region: 'US', country: 'United States',
    media_class: 'digital_native', topic_class: 'politics',
  },
  {
    feed_url: 'https://feeds.npr.org/1014/rss.xml',
    publisher_name: 'NPR Politics', publisher_domain: 'npr.org',
    region: 'US', country: 'United States',
    media_class: 'digital_native', topic_class: 'politics',
  },
  {
    feed_url: 'https://www.breitbart.com/feed/',
    publisher_name: 'Breitbart', publisher_domain: 'breitbart.com',
    region: 'US', country: 'United States',
    media_class: 'fringe', topic_class: 'politics',
  },
  {
    feed_url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
    publisher_name: 'New York Times', publisher_domain: 'nytimes.com',
    region: 'US', country: 'United States',
    media_class: 'broadsheet', topic_class: 'politics',
  },
  {
    feed_url: 'https://theintercept.com/feed/?rss',
    publisher_name: 'The Intercept', publisher_domain: 'theintercept.com',
    region: 'US', country: 'United States',
    media_class: 'digital_native', topic_class: 'politics',
  },
  {
    feed_url: 'https://reason.com/feed/',
    publisher_name: 'Reason', publisher_domain: 'reason.com',
    region: 'US', country: 'United States',
    media_class: 'digital_native', topic_class: 'opinion',
  },
  {
    feed_url: 'https://www.motherjones.com/feed/',
    publisher_name: 'Mother Jones', publisher_domain: 'motherjones.com',
    region: 'US', country: 'United States',
    media_class: 'digital_native', topic_class: 'politics',
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  {
    feed_url: 'https://www.spiegel.de/international/index.rss',
    publisher_name: 'Spiegel International', publisher_domain: 'spiegel.de',
    region: 'EU', country: 'Germany',
    media_class: 'broadsheet', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.politico.eu/feed/',
    publisher_name: 'Politico Europe', publisher_domain: 'politico.eu',
    region: 'EU', country: 'Europe',
    media_class: 'digital_native', topic_class: 'politics',
  },
  {
    feed_url: 'https://euobserver.com/rss.xml',
    publisher_name: 'EUobserver', publisher_domain: 'euobserver.com',
    region: 'EU', country: 'Europe',
    media_class: 'digital_native', topic_class: 'politics',
  },

  // ── International / State Media ───────────────────────────────────────────
  {
    feed_url: 'https://www.rt.com/rss/news/',
    publisher_name: 'RT', publisher_domain: 'rt.com',
    region: 'INT', country: 'Russia',
    media_class: 'state_media', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.aljazeera.com/xml/rss/all.xml',
    publisher_name: 'Al Jazeera', publisher_domain: 'aljazeera.com',
    region: 'INT', country: 'Qatar',
    media_class: 'broadsheet', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.globaltimes.cn/rss/outbrain.xml',
    publisher_name: 'Global Times', publisher_domain: 'globaltimes.cn',
    region: 'INT', country: 'China',
    media_class: 'state_media', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.middleeasteye.net/rss',
    publisher_name: 'Middle East Eye', publisher_domain: 'middleeasteye.net',
    region: 'INT', country: 'United Kingdom',
    media_class: 'digital_native', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.france24.com/en/rss',
    publisher_name: 'France 24', publisher_domain: 'france24.com',
    region: 'INT', country: 'France',
    media_class: 'broadsheet', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.voanews.com/api/zktveepqi_',
    publisher_name: 'Voice of America', publisher_domain: 'voanews.com',
    region: 'INT', country: 'United States',
    media_class: 'state_media', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.scmp.com/rss/91/feed',
    publisher_name: 'South China Morning Post', publisher_domain: 'scmp.com',
    region: 'INT', country: 'Hong Kong',
    media_class: 'broadsheet', topic_class: 'general_news',
  },

  // ── Advertorial / PR-Disguised Business Media ─────────────────────────────
  // High value: editorial cover used to push commercial agendas.
  // Expect moderate-high SPI. Contrast against broadsheets for newsletter insight.
  {
    feed_url: 'https://www.entrepreneur.com/latest.rss',
    publisher_name: 'Entrepreneur', publisher_domain: 'entrepreneur.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
  {
    feed_url: 'https://www.inc.com/rss',
    publisher_name: 'Inc.', publisher_domain: 'inc.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
  {
    feed_url: 'https://www.fastcompany.com/latest/rss',
    publisher_name: 'Fast Company', publisher_domain: 'fastcompany.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
  {
    feed_url: 'https://www.forbes.com/real-time/feed2/',
    publisher_name: 'Forbes', publisher_domain: 'forbes.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
  {
    feed_url: 'https://feeds.businessinsider.com/custom/all',
    publisher_name: 'Business Insider', publisher_domain: 'businessinsider.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },

  // ── Lifestyle / Health Media (commercially oriented) ──────────────────────
  // Supplement and pharma adjacency. High manipulation density expected.
  // "This article in Men's Health scores higher than a supplement ad" — newsletter gold.
  {
    feed_url: 'https://www.menshealth.com/rss/all.xml/',
    publisher_name: "Men's Health", publisher_domain: 'menshealth.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.womenshealthmag.com/rss/all.xml/',
    publisher_name: "Women's Health", publisher_domain: 'womenshealthmag.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.prevention.com/rss/all.xml/',
    publisher_name: 'Prevention', publisher_domain: 'prevention.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.healthline.com/rss/health-news',
    publisher_name: 'Healthline', publisher_domain: 'healthline.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.mindbodygreen.com/rss.xml',
    publisher_name: 'MindBodyGreen', publisher_domain: 'mindbodygreen.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://draxe.com/feed/',
    publisher_name: 'Dr. Axe', publisher_domain: 'draxe.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://articles.mercola.com/sites/articles/rss.aspx',
    publisher_name: 'Mercola', publisher_domain: 'mercola.com',
    region: 'US', country: 'United States',
    media_class: 'fringe', topic_class: 'health_wellness',
  },

  // ── Self-Improvement / Info Products ─────────────────────────────────────
  // Course creators and coaching brands. Aspirational manipulation, fear of missing out,
  // identity threat. High SPI expected. Direct contrast to news sources = strong newsletter angle.
  {
    feed_url: 'https://www.tonyrobbins.com/feed/',
    publisher_name: 'Tony Robbins', publisher_domain: 'tonyrobbins.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'self_improvement',
  },
  {
    feed_url: 'https://www.mindvalley.com/blog/feed',
    publisher_name: 'Mindvalley', publisher_domain: 'mindvalley.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'self_improvement',
  },
  {
    feed_url: 'https://www.iwillteachyoutoberich.com/feed/',
    publisher_name: 'I Will Teach You To Be Rich', publisher_domain: 'iwillteachyoutoberich.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'self_improvement',
  },
  {
    feed_url: 'https://foundr.com/feed',
    publisher_name: 'Foundr', publisher_domain: 'foundr.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'self_improvement',
  },

  // ── Charities & NGOs ──────────────────────────────────────────────────────
  // Most surprising category — trusted brands using high-emotion manipulation tactics.
  // Guilt, urgency, social proof, identifiable victim effect.
  // "Your favourite charity scores higher than a supplement ad" = standout newsletter edition.
  {
    feed_url: 'https://www.savethechildren.org/us/about-us/media-and-news/news-feed.rss',
    publisher_name: 'Save the Children', publisher_domain: 'savethechildren.org',
    region: 'US', country: 'United States',
    media_class: 'charity', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.wwf.org.uk/rss.xml',
    publisher_name: 'WWF UK', publisher_domain: 'wwf.org.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'charity', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.greenpeace.org/international/feed/',
    publisher_name: 'Greenpeace International', publisher_domain: 'greenpeace.org',
    region: 'INT', country: 'International',
    media_class: 'charity', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.oxfam.org/en/rss.xml',
    publisher_name: 'Oxfam', publisher_domain: 'oxfam.org',
    region: 'INT', country: 'United Kingdom',
    media_class: 'charity', topic_class: 'general_news',
  },
  {
    feed_url: 'https://www.amnesty.org/en/feed/',
    publisher_name: 'Amnesty International', publisher_domain: 'amnesty.org',
    region: 'INT', country: 'International',
    media_class: 'charity', topic_class: 'general_news',
  },

  // ── Government & Public Health ────────────────────────────────────────────
  // Behavioural nudge units use psychology tactics by design.
  // Controversial findings — high media pickup potential.
  // ZA government comms included for local relevance.
  {
    feed_url: 'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml',
    publisher_name: 'World Health Organization', publisher_domain: 'who.int',
    region: 'INT', country: 'International',
    media_class: 'government', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.cdc.gov/media/rss/feeds/news.xml',
    publisher_name: 'CDC', publisher_domain: 'cdc.gov',
    region: 'US', country: 'United States',
    media_class: 'government', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.nhs.uk/news/rss.aspx',
    publisher_name: 'NHS', publisher_domain: 'nhs.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'government', topic_class: 'health_wellness',
  },
  {
    feed_url: 'https://www.gov.za/rss.xml',
    publisher_name: 'South African Government', publisher_domain: 'gov.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'government', topic_class: 'politics',
  },

  // ── Higher Education ──────────────────────────────────────────────────────
  // Universities selling $100K+ decisions using aspiration, scarcity, fear.
  // Nobody indexes this. High surprise value. Global reach.
  {
    feed_url: 'https://news.harvard.edu/gazette/feed/',
    publisher_name: 'Harvard Gazette', publisher_domain: 'harvard.edu',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'higher_education',
  },
  {
    feed_url: 'https://www.wbs.ac.uk/news/feed/',
    publisher_name: 'Warwick Business School', publisher_domain: 'wbs.ac.uk',
    region: 'UK', country: 'United Kingdom',
    media_class: 'advertorial', topic_class: 'higher_education',
  },
  {
    feed_url: 'https://www.gsb.uct.ac.za/rss',
    publisher_name: 'UCT Graduate School of Business', publisher_domain: 'gsb.uct.ac.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'advertorial', topic_class: 'higher_education',
  },
  {
    feed_url: 'https://poetsandquants.com/feed/',
    publisher_name: 'Poets & Quants', publisher_domain: 'poetsandquants.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'higher_education',
  },

  // ── Recruitment & Employer Branding ───────────────────────────────────────
  // "We're a family" culture manipulation. Universally relatable pain.
  // High SPI expected on job descriptions and employer brand content.
  {
    feed_url: 'https://www.linkedin.com/blog/feed',
    publisher_name: 'LinkedIn Blog', publisher_domain: 'linkedin.com',
    region: 'US', country: 'United States',
    media_class: 'recruitment', topic_class: 'hr_recruitment',
  },
  {
    feed_url: 'https://www.glassdoor.com/blog/feed/',
    publisher_name: 'Glassdoor Blog', publisher_domain: 'glassdoor.com',
    region: 'US', country: 'United States',
    media_class: 'recruitment', topic_class: 'hr_recruitment',
  },
  {
    feed_url: 'https://blog.indeed.com/feed/',
    publisher_name: 'Indeed Blog', publisher_domain: 'indeed.com',
    region: 'US', country: 'United States',
    media_class: 'recruitment', topic_class: 'hr_recruitment',
  },
  {
    feed_url: 'https://www.shrm.org/rss/pages/rss.aspx',
    publisher_name: 'SHRM', publisher_domain: 'shrm.org',
    region: 'US', country: 'United States',
    media_class: 'recruitment', topic_class: 'hr_recruitment',
  },

  // ── Real Estate ───────────────────────────────────────────────────────────
  // Property listing copy is a masterclass in anchoring, FOMO, and artificial scarcity.
  // ZA sources included for local relevance to newsletter audience.
  {
    feed_url: 'https://www.privateproperty.co.za/rss/news',
    publisher_name: 'Private Property ZA', publisher_domain: 'privateproperty.co.za',
    region: 'ZA', country: 'South Africa',
    media_class: 'advertorial', topic_class: 'real_estate',
  },
  {
    feed_url: 'https://www.property24.com/rss/articles',
    publisher_name: 'Property24', publisher_domain: 'property24.com',
    region: 'ZA', country: 'South Africa',
    media_class: 'advertorial', topic_class: 'real_estate',
  },
  {
    feed_url: 'https://www.realtor.com/news/feed/',
    publisher_name: 'Realtor.com', publisher_domain: 'realtor.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'real_estate',
  },
  {
    feed_url: 'https://www.zillow.com/blog/feed/',
    publisher_name: 'Zillow Blog', publisher_domain: 'zillow.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'real_estate',
  },

  // ── Legal & Financial Services ────────────────────────────────────────────
  // Personal injury, debt, and payday lending copy is high-manipulation by design.
  // Fear-based, urgency-heavy. Strong contrast to broadsheet financial news.
  {
    feed_url: 'https://www.debt.com/blog/feed/',
    publisher_name: 'Debt.com', publisher_domain: 'debt.com',
    region: 'US', country: 'United States',
    media_class: 'health_commercial', topic_class: 'business',
  },
  {
    feed_url: 'https://www.nerdwallet.com/blog/feed/',
    publisher_name: 'NerdWallet', publisher_domain: 'nerdwallet.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
  {
    feed_url: 'https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline',
    publisher_name: 'Investopedia', publisher_domain: 'investopedia.com',
    region: 'US', country: 'United States',
    media_class: 'advertorial', topic_class: 'business',
  },
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
  timeout: 10000,
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

async function isAlreadyScanned(contentHash) {
  const { data } = await supabase
    .from('crawler_scans')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();
  return !!data;
}

async function scanContent(text, articleUrl) {
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
        url:   articleUrl,
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

async function storeScan(scan) {
  const { data, error } = await supabase
    .from('crawler_scans')
    .insert({
      analyzer_version:      SCAN_VERSION.analyzer,
      taxonomy_version:      SCAN_VERSION.taxonomy,
      prompt_version:        SCAN_VERSION.prompt,

      feed_url:              scan.feed.feed_url,
      publisher_name:        scan.feed.publisher_name,
      publisher_domain:      scan.feed.publisher_domain,
      region:                scan.feed.region,
      country:               scan.feed.country,
      media_class:           scan.feed.media_class,
      topic_class:           scan.feed.topic_class,

      article_url:           scan.article.url,
      article_domain:        scan.article.domain,
      headline_text:         scan.article.headline,
      published_at:          scan.article.publishedAt,

      content_hash:          scan.content.hash,
      content_length:        scan.content.length,
      truncated:             scan.content.truncated,
      content_extraction_type: scan.content.extractionType,

      language:              scan.language.lang,
      language_confidence:   scan.language.confidence,
      in_distribution:       scan.language.in_distribution,

      scan_source:           'crawler',
      scan_status:           'success',
      scanned_at:            new Date().toISOString(),

      spi_score:             scan.result.spi_score ?? null,
      the_play:              scan.result.the_play ?? null,
      emotional_targets:     scan.result.emotional_targets ?? null,
      blind_spots:           scan.result.blind_spots ?? null,
      the_verdict:           scan.result.the_verdict ?? null,
      raw_output:            scan.result,

      tactic_vector:         buildTacticVector(scan.result.tactics ?? []),
    })
    .select('id')
    .single();

  if (error) throw error;

  const tactics = scan.result.tactics;
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

async function logScanStatus(meta, status, reason = null) {
  try {
    const { error } = await supabase.from('crawler_scans').insert({
      feed_url:           meta.feed_url,
      publisher_name:     meta.publisher_name,
      publisher_domain:   meta.publisher_domain,
      article_url:        meta.url ?? null,
      headline_text:      meta.title ?? null,
      scan_source:        'crawler',
      scan_status:        status,
      scan_status_reason: reason,
      analyzer_version:   SCAN_VERSION.analyzer,
      taxonomy_version:   SCAN_VERSION.taxonomy,
      prompt_version:     SCAN_VERSION.prompt,
      content_hash:       hashContent((meta.url ?? meta.feed_url ?? '') + '_err_' + Date.now().toString()),
      scanned_at:         new Date().toISOString(),
    });
    if (error) {
      console.warn('  ⚠️  logScanStatus insert failed:', error.message);
    }
  } catch (e) {
    console.warn('  ⚠️  logScanStatus failed silently:', e.message);
  }
}

// ─── FEED PROCESSOR ──────────────────────────────────────────────────────────
async function processFeed(feedConfig) {
  console.log(`\n📡 ${feedConfig.publisher_name} (${feedConfig.region}) [${feedConfig.media_class}]`);
  let feed;

  try {
    feed = await parser.parseURL(feedConfig.feed_url);
  } catch (err) {
    console.warn(`  ⚠️  Feed fetch failed: ${err.message}`);
    await logScanStatus(feedConfig, 'feed_error', err.message);
    return { attempted: 0, scanned: 0, skipped: 0, errors: 1 };
  }

  const items = feed.items.slice(0, MAX_ARTICLES_PER_FEED);
  let scanned = 0, skipped = 0, errors = 0;

  for (const item of items) {
    const { text: rawText, extraction_type } = extractContent(item);
    const articleMeta = {
      ...feedConfig,
      url:   item.link || item.guid || '',
      title: item.title || '',
    };

    if (rawText.length < MIN_CONTENT_LENGTH) {
      console.log(`  ⏭️  Too short (${rawText.length} chars): ${item.title?.slice(0, 50)}`);
      await logScanStatus(articleMeta, 'skipped', 'short_content');
      skipped++;
      continue;
    }

    const contentHash = hashContent(rawText);

    if (await isAlreadyScanned(contentHash)) {
      console.log(`  ↩️  Duplicate: ${item.title?.slice(0, 50)}`);
      skipped++;
      continue;
    }

    const { text: finalText, truncated } = truncateContent(rawText, MAX_CONTENT_LENGTH);
    const langResult = detectLanguage(finalText);

    if (!langResult.in_distribution) {
      console.log(`  🌐 Non-English detected (${langResult.lang}) — scan will be flagged`);
    }

    try {
      console.log(`  🔍 Scanning: ${item.title?.slice(0, 55)}`);
      const result = await scanContent(finalText, articleMeta.url);

      await storeScan({
        feed:    feedConfig,
        article: {
          url:         articleMeta.url,
          domain:      new URL(articleMeta.url || feedConfig.feed_url).hostname,
          headline:    item.title || '',
          publishedAt: item.pubDate || item.isoDate || null,
        },
        content: {
          hash:           contentHash,
          length:         rawText.length,
          truncated,
          extractionType: extraction_type,
        },
        language: langResult,
        result,
      });

      console.log(`  ✅ SPI ${result.spi_score ?? '?'} | ${extraction_type} | ${langResult.lang} | ${item.title?.slice(0, 40)}`);
      scanned++;

      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      await logScanStatus(articleMeta, 'analysis_error', err.message);
      errors++;
    }
  }

  return { attempted: items.length, scanned, skipped, errors };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🕵️  BSDetective Crawler');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔖 ${JSON.stringify(SCAN_VERSION)}`);
  console.log(`📰 Feeds: ${FEEDS.length} | Max per feed: ${MAX_ARTICLES_PER_FEED}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, or SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const totals = { attempted: 0, scanned: 0, skipped: 0, errors: 0 };

  for (const feed of FEEDS) {
    const result = await processFeed(feed);
    totals.attempted += result.attempted;
    totals.scanned   += result.scanned;
    totals.skipped   += result.skipped;
    totals.errors    += result.errors;
  }

  console.log('\n─────────────────────────────────────');
  console.log('📊 Run Summary');
  console.log(`  Feeds      : ${FEEDS.length}`);
  console.log(`  Attempted  : ${totals.attempted}`);
  console.log(`  Scanned    : ${totals.scanned}`);
  console.log(`  Skipped    : ${totals.skipped}`);
  console.log(`  Errors     : ${totals.errors}`);
  console.log(`  Est. cost  : $${(totals.scanned * 0.006).toFixed(3)}`);
  console.log(`  Versions   : ${JSON.stringify(SCAN_VERSION)}`);
  console.log('─────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
