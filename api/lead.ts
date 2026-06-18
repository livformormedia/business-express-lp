import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Free-challenge lead capture → Supabase bex_events + Meta CAPI Lead (deduped
// with the browser pixel via the shared event_id). Fires alongside Make webhook.
const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FB_PIXEL_ID = '1039518565415330';
const FB_CAPI_TOKEN = process.env.BE_FB_CAPI_ACCESS_TOKEN || process.env.FB_CAPI_ACCESS_TOKEN || '';
const FB_API = 'https://graph.facebook.com/v21.0';

const ALLOWED_HOSTS = ['businessexpress.livformor.com'];
function originOk(req: VercelRequest): boolean {
  const src = ((req.headers.origin as string) || (req.headers.referer as string) || '').trim();
  if (!src) return true; // no Origin/Referer (rare legit case) — don't drop a real lead
  try { const h = new URL(src).hostname; return ALLOWED_HOSTS.indexOf(h) >= 0 || h.endsWith('.vercel.app'); } catch { return false; }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const normPhone = (p: string) => { let d = (p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };

async function fireCapiLead(o: {
  eventId: string; email: string; phone: string; name: string; ip: string; ua: string; pageUrl: string; fbp?: string; fbc?: string;
}): Promise<{ ok: boolean; received?: number; error?: string }> {
  if (!FB_CAPI_TOKEN) return { ok: false, error: 'no_token' };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((o.email || '').trim());
  const phoneDigits = (o.phone || '').replace(/\D/g, '');
  const phoneOk = phoneDigits.length >= 9 && phoneDigits.length <= 15;
  if (!emailOk && !phoneOk) return { ok: false, error: 'no_valid_pii' }; // never send junk to Meta
  const user_data: Record<string, any> = {};
  if (emailOk) user_data.em = [sha256(o.email.trim().toLowerCase())];
  if (phoneOk) { const ph = normPhone(o.phone); if (ph) user_data.ph = [sha256(ph)]; }
  if (o.name) { const parts = o.name.trim().toLowerCase().split(/\s+/); if (parts[0]) user_data.fn = [sha256(parts[0])]; if (parts.length > 1) user_data.ln = [sha256(parts[parts.length - 1])]; }
  if (o.ip) user_data.client_ip_address = o.ip;
  if (o.ua) user_data.client_user_agent = o.ua;
  if (o.fbp) user_data.fbp = o.fbp;
  if (o.fbc) user_data.fbc = o.fbc;
  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: o.eventId,
      action_source: 'website',
      event_source_url: o.pageUrl || undefined,
      user_data,
      custom_data: { currency: 'ILS', value: 0, content_name: 'Esek LeKulam 4-Day Free Challenge' },
    }],
  };
  try {
    const r = await fetch(`${FB_API}/${FB_PIXEL_ID}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, access_token: FB_CAPI_TOKEN }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `http_${r.status}` };
    return { ok: true, received: j?.events_received };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch_failed' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!originOk(req)) return res.status(403).json({ ok: false, error: 'forbidden_origin' });

  const body = (typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const tx_id = String(body.fb_event_id || body.tx_id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
  const ua = (req.headers['user-agent'] as string) || '';
  const cookies = (req.headers.cookie || '').split(';').reduce((a, c) => { const i = c.indexOf('='); if (i > 0) a[c.slice(0, i).trim()] = c.slice(i + 1).trim(); return a; }, {} as Record<string, string>);
  const fbp = cookies._fbp || undefined;
  const fbc = cookies._fbc || (body.fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${body.fbclid}` : undefined);

  // 1) Supabase insert (independent of CAPI)
  let dbOk = true; let dbErr: string | undefined;
  if (SUPABASE_READY) {
    const { error } = await supabase.from('bex_events').insert({
      tx_id,
      event_type: 'lead',
      name: String(body.name || '').trim() || null,
      email: String(body.email || '').trim().toLowerCase() || null,
      phone: String(body.phone || '').trim() || null,
      variant: String(body.variant || 'a'),
      amount: 0,
      price_nis: 0,
      workshop_date: body.challenge_date || body.workshop_date || null,
      workshop_time: body.challenge_time || body.workshop_time || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      fbclid: body.fbclid || null,
      gclid: body.gclid || null,
      referrer: body.referrer || null,
      page_url: body.page_url || body.landing_url || null,
      user_agent: ua,
      ip,
      status: 'registered',
      consent_marketing: Boolean(body.consent_marketing),
      consent_at: body.consent_at || new Date().toISOString(),
      raw_payload: { source: 'free-lp', body },
    });
    if (error) { dbOk = false; dbErr = error.message; console.error('[lead] insert_error', error.message); }
  } else { dbOk = false; dbErr = 'supabase_not_configured'; }

  // 2) Meta CAPI Lead — server-side, deduped against the browser pixel via event_id = tx_id
  const capi = await fireCapiLead({
    eventId: tx_id, email: String(body.email || ''), phone: String(body.phone || ''), name: String(body.name || ''),
    ip, ua, pageUrl: String(body.page_url || body.landing_url || ''), fbp, fbc,
  });
  if (!capi.ok) console.error('[lead] capi_error', capi.error);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(dbOk || capi.ok ? 200 : 500).json({ ok: dbOk, tx_id, db_error: dbErr, capi });
}
