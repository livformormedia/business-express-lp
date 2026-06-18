import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// First-party page analytics ingest → bex_sessions via the bex_track() merge fn.
// One row per browser session; scroll/engaged kept as running MAX, funnel flags OR'd.
const READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALLOWED_HOSTS = ['businessexpress.livformor.com'];
function originOk(req: VercelRequest): boolean {
  const src = ((req.headers.origin as string) || (req.headers.referer as string) || '').trim();
  if (!src) return true;
  try { const h = new URL(src).hostname; return ALLOWED_HOSTS.indexOf(h) >= 0 || h.endsWith('.vercel.app'); } catch { return false; }
}

const pct = (n: any) => Math.max(0, Math.min(100, parseInt(n, 10) || 0));
const secs = (n: any) => Math.max(0, Math.min(86400, parseInt(n, 10) || 0));
const str = (v: any, max: number) => (v == null ? null : String(v).slice(0, max) || null);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!originOk(req)) return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  if (!READY) return res.status(200).json({ ok: false });

  // body can arrive as parsed object (fetch json) or string (sendBeacon)
  let body: Record<string, any> = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { body = {}; }
  const sid = str(body.session_id, 80);
  if (!sid) return res.status(200).json({ ok: false, reason: 'no_session' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
  const ua = String((req.headers['user-agent'] as string) || '').slice(0, 400);

  const { error } = await supabase.rpc('bex_track', {
    p_session_id: sid,
    p_variant: str(body.variant, 8),
    p_utm_source: str(body.utm_source, 200), p_utm_medium: str(body.utm_medium, 200), p_utm_campaign: str(body.utm_campaign, 200),
    p_utm_content: str(body.utm_content, 200), p_utm_term: str(body.utm_term, 200),
    p_fbclid: str(body.fbclid, 300), p_gclid: str(body.gclid, 300),
    p_referrer: str(body.referrer, 300), p_page_url: str(body.page_url, 400), p_page_path: str(body.page_path, 200),
    p_device: str(body.device, 16), p_user_agent: ua, p_ip: ip,
    p_scroll: pct(body.scroll_pct), p_engaged: secs(body.engaged_seconds),
    p_reached_form: Boolean(body.reached_form), p_converted: Boolean(body.converted),
  });
  if (error) { console.error('[track] rpc_error', error.message); return res.status(200).json({ ok: false }); }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}
