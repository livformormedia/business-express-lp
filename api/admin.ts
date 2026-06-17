import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Basic Auth gate. User: admin. Password: ADMIN_PASSWORD env var.
function checkAuth(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
    const [, pwd] = decoded.split(':');
    return pwd === expected;
  } catch {
    return false;
  }
}

type Row = {
  id: number;
  tx_id: string;
  event_type: 'lead' | 'purchase' | 'failed';
  name: string | null;
  email: string | null;
  phone: string | null;
  variant: string | null;
  amount: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer: string | null;
  page_url: string | null;
  status: string | null;
  cardcom_response_code: number | null;
  created_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BEX Admin"');
    return res.status(401).send('Unauthorized');
  }
  if (!SUPABASE_READY) {
    return res.status(500).json({ error: 'supabase_not_configured' });
  }

  // Pull last 2000 rows (reasonable cap; can paginate later if needed)
  const { data, error } = await supabase
    .from('bex_events')
    .select('id, tx_id, event_type, name, email, phone, variant, amount, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, referrer, page_url, status, cardcom_response_code, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[admin] supabase_error', error.message);
    return res.status(500).json({ error: 'supabase_query_failed', message: error.message });
  }

  const rows = (data || []) as Row[];

  // De-duplicate leads by tx_id (keep latest version of each lead)
  const leadByTx = new Map<string, Row>();
  const purchaseByTx = new Map<string, Row>();
  for (const r of rows) {
    if (r.event_type === 'lead' && !leadByTx.has(r.tx_id)) leadByTx.set(r.tx_id, r);
    if (r.event_type === 'purchase' && !purchaseByTx.has(r.tx_id)) purchaseByTx.set(r.tx_id, r);
  }

  // Merged view: one row per tx_id, with paid status derived from purchase presence.
  const merged = Array.from(leadByTx.values()).map((lead) => {
    const purchase = purchaseByTx.get(lead.tx_id);
    return {
      ...lead,
      paid: Boolean(purchase),
      paid_at: purchase?.created_at || null,
      paid_amount: purchase?.amount || null,
    };
  }).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  // Aggregations
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const isToday = (iso: string) => (now - Date.parse(iso)) < ONE_DAY;

  const leadsTotal = merged.length;
  const leadsToday = merged.filter((r) => isToday(r.created_at)).length;
  const purchases = merged.filter((r) => r.paid);
  const purchasesTotal = purchases.length;
  const purchasesToday = purchases.filter((r) => r.paid_at && isToday(r.paid_at)).length;
  const revenue = purchases.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);
  const conv = leadsTotal ? (purchasesTotal / leadsTotal) * 100 : 0;

  // Variant split
  const variantSplit: Record<string, { leads: number; purchases: number; revenue: number; conv: number }> = {};
  for (const v of ['a', 'b', 'c']) {
    const vLeads = merged.filter((r) => (r.variant || 'a').toLowerCase() === v);
    const vPaid = vLeads.filter((r) => r.paid);
    variantSplit[v] = {
      leads: vLeads.length,
      purchases: vPaid.length,
      revenue: vPaid.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0),
      conv: vLeads.length ? (vPaid.length / vLeads.length) * 100 : 0,
    };
  }

  // Source breakdown (utm_source ?? referrer-host ?? '(direct)')
  const bySource = new Map<string, { leads: number; purchases: number; revenue: number }>();
  for (const r of merged) {
    let src = r.utm_source || '';
    if (!src && r.referrer) {
      try { src = new URL(r.referrer).hostname; } catch { src = r.referrer; }
    }
    if (!src) src = '(direct)';
    const bucket = bySource.get(src) || { leads: 0, purchases: 0, revenue: 0 };
    bucket.leads++;
    if (r.paid) {
      bucket.purchases++;
      bucket.revenue += Number(r.paid_amount) || 0;
    }
    bySource.set(src, bucket);
  }
  const sourceBreakdown = Array.from(bySource.entries())
    .map(([source, v]) => ({ source, ...v, conv: v.leads ? (v.purchases / v.leads) * 100 : 0 }))
    .sort((a, b) => b.leads - a.leads);

  // Campaign breakdown (utm_campaign)
  const byCampaign = new Map<string, { leads: number; purchases: number; revenue: number }>();
  for (const r of merged) {
    const c = r.utm_campaign || '(none)';
    const bucket = byCampaign.get(c) || { leads: 0, purchases: 0, revenue: 0 };
    bucket.leads++;
    if (r.paid) {
      bucket.purchases++;
      bucket.revenue += Number(r.paid_amount) || 0;
    }
    byCampaign.set(c, bucket);
  }
  const campaignBreakdown = Array.from(byCampaign.entries())
    .map(([campaign, v]) => ({ campaign, ...v, conv: v.leads ? (v.purchases / v.leads) * 100 : 0 }))
    .sort((a, b) => b.leads - a.leads);

  res.setHeader('Cache-Control', 's-maxage=0, no-store');
  return res.status(200).json({
    generated_at: new Date().toISOString(),
    kpis: {
      leads_today: leadsToday,
      leads_total: leadsTotal,
      purchases_today: purchasesToday,
      purchases_total: purchasesTotal,
      revenue,
      conversion_pct: conv,
    },
    variants: variantSplit,
    sources: sourceBreakdown,
    campaigns: campaignBreakdown,
    leads: merged.slice(0, 200), // most recent 200 for table
  });
}
