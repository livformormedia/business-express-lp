import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Free-challenge lead capture → Supabase bex_events. No payment.
// Fires alongside the Make webhook (client-side). tx_id = fb_event_id for dedup.
const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!SUPABASE_READY) return res.status(200).json({ ok: false, reason: 'supabase_not_configured' });

  const body = (typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const tx_id = String(body.fb_event_id || body.tx_id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
  const ua = (req.headers['user-agent'] as string) || '';

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

  if (error) {
    console.error('[lead] insert_error', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, tx_id });
}
