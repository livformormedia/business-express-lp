import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// PUBLIC dashboard stats — aggregates only, ZERO PII.
// Funnel from bex_sessions (landings → scroll → form-start → conversion),
// per variant + per source, via the bex_stats() SQL function. Plus the
// authoritative recorded-lead count from bex_events for reconciliation.
const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Only the NEW free-challenge campaign. The prior PAID run (ended 2026-06-07) is excluded.
const CAMPAIGN_START = '2026-06-17T00:00:00Z';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!SUPABASE_READY) return res.status(500).json({ error: 'supabase_not_configured' });

  const [analyticsRes, leadCountRes] = await Promise.all([
    supabase.rpc('bex_stats', { p_since: CAMPAIGN_START }),
    supabase.from('bex_events').select('tx_id', { count: 'exact', head: true }).eq('event_type', 'lead').gte('created_at', CAMPAIGN_START),
  ]);

  if (analyticsRes.error) return res.status(500).json({ error: analyticsRes.error.message });

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
  return res.status(200).json({
    generated_at: new Date().toISOString(),
    campaign_start: CAMPAIGN_START,
    leads_recorded: leadCountRes?.count ?? null,
    analytics: analyticsRes.data || {},
  });
}
