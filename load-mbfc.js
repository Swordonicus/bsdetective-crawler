/**
 * load-mbfc.js
 * ─────────────────────────────────────────────────────────────────
 * One-time script. Run manually after enrichment_migration.sql.
 * Fetches the community MBFC dataset (~3,500 sources) from GitHub,
 * normalises the fields, and upserts into domain_enrichment.
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node load-mbfc.js
 *
 * Safe to re-run — uses upsert so existing rows are updated.
 * ─────────────────────────────────────────────────────────────────
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Community-maintained MBFC dataset (ramybaly/News-Media-Reliability)
const MBFC_DATASET_URL = 'https://raw.githubusercontent.com/ramybaly/News-Media-Reliability/master/data/corpus.json';

// ── Credibility derivation ────────────────────────────────────────────────────
// Maps MBFC factuality + bias to a simple 3-tier credibility label
// Used as a quick-read field in the Manipulation Report

function deriveCredibility(bias, factuality) {
  const lowFactuality  = ['Very Low', 'Low'];
  const highFactuality = ['Very High', 'High'];
  const disputed       = ['Conspiracy-Pseudoscience', 'Extreme Right', 'Extreme Left'];

  if (disputed.includes(bias))              return 'DISPUTED';
  if (lowFactuality.includes(factuality))   return 'LOW';
  if (highFactuality.includes(factuality))  return 'HIGH';
  return 'MIXED';
}

// ── Normalise MBFC bias labels ────────────────────────────────────────────────
// The dataset uses slightly inconsistent casing — normalise for consistency

function normaliseBias(raw) {
  if (!raw) return null;
  const map = {
    'left':                      'Left',
    'left-center':               'Left-Center',
    'least biased':              'Least Biased',
    'right-center':              'Right-Center',
    'right':                     'Right',
    'extreme right':             'Extreme Right',
    'extreme left':              'Extreme Left',
    'conspiracy-pseudoscience':  'Conspiracy-Pseudoscience',
    'pro-science':               'Pro-Science',
    'satire':                    'Satire',
  };
  return map[raw.toLowerCase().trim()] || raw;
}

// ── Normalise factuality labels ───────────────────────────────────────────────

function normaliseFactuality(raw) {
  if (!raw) return null;
  const map = {
    'very high':     'Very High',
    'high':          'High',
    'mostly factual': 'Mostly Factual',
    'mixed':         'Mixed',
    'low':           'Low',
    'very low':      'Very Low',
    'n/a':           'N/A',
  };
  return map[raw.toLowerCase().trim()] || raw;
}

// ── Normalise domain ──────────────────────────────────────────────────────────
// Strip protocol and www so domains match what crawler extracts

function normaliseDomain(url) {
  if (!url) return null;
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Fetch dataset
  console.log('Fetching MBFC dataset...');
  const res = await fetch(MBFC_DATASET_URL);
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
  const raw = await res.json();

  console.log(`Raw records: ${raw.length}`);

  // 2. Transform
  const rows = [];
  for (const item of raw) {
    const domain = normaliseDomain(item.source_url_normalized || item.url || item.domain);
    if (!domain) continue;

    const bias        = normaliseBias(item.bias);
    const factuality  = normaliseFactuality(item.factual_reporting);
    const credibility = deriveCredibility(bias, factuality);

    rows.push({
      domain,
      mbfc_bias:        bias,
      mbfc_factuality:  factuality,
      mbfc_country:     item.country || null,
      mbfc_credibility: credibility,
      source:           'mbfc',
      updated_at:       new Date().toISOString(),
    });
  }

  // Deduplicate on domain (dataset occasionally has duplicates)
  const seen = new Set();
  const deduped = rows.filter(r => {
    if (seen.has(r.domain)) return false;
    seen.add(r.domain);
    return true;
  });

  console.log(`Prepared ${deduped.length} unique domain records`);

  // 3. Upsert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('domain_enrichment')
      .upsert(batch, { onConflict: 'domain' });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} — ${inserted}/${deduped.length}`);
    }
  }

  console.log(`\n✓ Done. ${inserted} domain enrichment records loaded into Supabase.`);

  // 4. Spot-check
  const { data: sample } = await supabase
    .from('domain_enrichment')
    .select('domain, mbfc_bias, mbfc_factuality, mbfc_credibility')
    .limit(5);

  console.log('\nSample rows:');
  console.table(sample);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
