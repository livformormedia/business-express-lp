import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// PUBLIC split-test stats — aggregates only, ZERO PII (no name/email/phone).
// Powers the shareable dashboard. Leads (registrations) by variant + source + day.
const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!SUPABASE_READY) return res.status(500).json({ error: 'supabase_not_configured' });

  const { data, error } = await supabase
    .from('bex_events')
    .select('tx_id, event_type, variant, utm_source, utm_campaign, referrer, created_at')
    .eq('event_type', 'lead')
    .order('created_at', { ascending: false })
    .limit(8000);
  if (error) return res.status(500).json({ error: error.message });

  // dedup leads by tx_id
  const seen = new Set<string>();
  const leads = (data || []).filter((r: any) => {
    if (!r.tx_id || seen.has(r.tx_id)) return false;
    seen.add(r.tx_id);
    return true;
  });

  const now = Date.now();
  const DAY = 86400000;
  const isToday = (iso: string) => now - Date.parse(iso) < DAY;
  const within = (iso: string, days: number) => now - Date.parse(iso) < days * DAY;

  const total = leads.length;
  const today = leads.filter((r: any) => isToday(r.created_at)).length;
  const last7 = leads.filter((r: any) => within(r.created_at, 7)).length;

  // by variant a-d
  const variants: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
  for (const r of leads) {
    const v = String(r.variant || 'a').toLowerCase();
    variants[v] = (variants[v] || 0) + 1;
  }

  // by traffic source (utm_source, else referrer host, else direct)
  const srcMap = new Map<string, number>();
  for (const r of leads) {
    let s = (r.utm_source || '').toString();
    if (!s && r.referrer) { try { s = new URL(r.referrer).hostname; } catch { s = r.referrer; } }
    if (!s) s = '(ישיר)';
    srcMap.set(s, (srcMap.get(s) || 0) + 1);
  }
  const sources = Array.from(srcMap.entries())
    .map(([source, leads]) => ({ source, leads }))
    .sort((a, b) => b.leads - a.leads);

  // by campaign
  const campMap = new Map<string, number>();
  for (const r of leads) {
    const c = (r.utm_campaign || '(ללא)').toString();
    campMap.set(c, (campMap.get(c) || 0) + 1);
  }
  const campaigns = Array.from(campMap.entries())
    .map(([campaign, leads]) => ({ campaign, leads }))
    .sort((a, b) => b.leads - a.leads);

  // daily trend (last 14 days)
  const days: { date: string; leads: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(now - i * DAY).toISOString().slice(0, 10);
    days.push({ date: key, leads: leads.filter((r: any) => (r.created_at || '').slice(0, 10) === key).length });
  }

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
  return res.status(200).json({ generated_at: new Date().toISOString(), total, today, last7, variants, sources, campaigns, days });
}
