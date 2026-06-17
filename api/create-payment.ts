import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
const normPhone = (p: string) => p.replace(/\D/g, '');

// Fire server-side Lead CAPI event (parallel to client Pixel). event_id = traceId for dedup w/ browser fbq.
async function fireLeadCapi(traceId: string, email: string, phone: string, name: string, value: number, ip: string, ua: string, fbclid: string, fbp: string) {
  const PIXEL_ID = process.env.BE_FB_PIXEL_ID;
  const TOKEN = process.env.BE_FB_CAPI_TOKEN;
  if (!PIXEL_ID || !TOKEN) return { sent: false, reason: 'no_creds' };
  const ud: Record<string, any> = {};
  if (email) ud.em = [sha256(email)];
  if (phone) ud.ph = [sha256(normPhone(phone))];
  const [fn, ...rest] = name.trim().split(/\s+/);
  if (fn) ud.fn = [sha256(fn)];
  if (rest.length) ud.ln = [sha256(rest.join(' '))];
  if (ip) ud.client_ip_address = ip;
  if (ua) ud.client_user_agent = ua;
  if (fbclid) ud.fbc = `fb.1.${Date.now()}.${fbclid}`;
  if (fbp) ud.fbp = fbp;
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: traceId,
          action_source: 'website',
          event_source_url: 'https://businessexpress.livformor.com/',
          user_data: ud,
          custom_data: {
            value, currency: 'ILS',
            content_name: 'Course Worth Millions Workshop',
            content_ids: ['bex-workshop-197'],
          },
        }],
      }),
    });
    const body = await r.json();
    return { sent: true, status: r.status, body };
  } catch (e: any) {
    return { sent: false, error: e?.message };
  }
}

const CARDCOM_LP_ENDPOINT = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';
// Flat workshop price — early-bird removed.
const FLAT_PRICE = 297;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const TerminalNumber = process.env.CARDCOM_TERMINAL_NUMBER;
  const ApiName = process.env.CARDCOM_API_NAME;
  const ApiPassword = process.env.CARDCOM_API_PASSWORD;
  if (!TerminalNumber || !ApiName || !ApiPassword) {
    return res.status(500).json({ error: 'cardcom_credentials_missing' });
  }

  const body = (typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const variant = String(body.variant || 'a');

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'businessexpress.livformor.com';
  const origin = `${proto}://${host}`;

  const traceId = `bex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Test bypass: ?test_key=<TEST_BYPASS_KEY env> → charge 1 NIS for E2E testing.
  const TEST_KEY = process.env.TEST_BYPASS_KEY;
  const submittedTestKey = String((req.query?.test_key ?? body.test_key) || '');
  const isTestMode = Boolean(TEST_KEY && submittedTestKey === TEST_KEY);
  const amount = isTestMode ? 1 : FLAT_PRICE;

  // Lead-only mode: log Supabase row, skip Cardcom session creation, return traceId.
  // Used when LP redirects to a pre-configured Cardcom PaymentSP page (upsell-enabled).
  const isLeadOnly = String((req.query?.lead_only ?? body.lead_only) || '') === 'true';
  if (isLeadOnly) {
    if (SUPABASE_READY) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
      const ua = (req.headers['user-agent'] as string) || '';
      const { error: supaErr } = await supabase.from('bex_events').insert({
        tx_id: traceId,
        event_type: 'lead',
        name,
        email,
        phone,
        variant,
        amount,
        price_nis: amount,
        workshop_date: body.workshop_date || null,
        workshop_time: body.workshop_time || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        fbclid: body.fbclid || null,
        gclid: body.gclid || null,
        referrer: body.referrer || null,
        page_url: body.page_url || null,
        user_agent: ua,
        ip,
        status: 'pending_payment',
        consent_marketing: Boolean(body.consent_marketing),
        consent_at: body.consent_at || new Date().toISOString(),
        raw_payload: { test_mode: isTestMode, source: 'lead-only', body },
      });
      if (supaErr) console.error('[create-payment lead-only] supabase_insert_error', supaErr.message);
    }
    // Fire server-side Lead CAPI in parallel to client Pixel. Same event_id for dedup.
    const ipL = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
    const uaL = (req.headers['user-agent'] as string) || '';
    const fbpL = (req.headers.cookie || '').match(/_fbp=([^;]+)/)?.[1] || '';
    const capiResL = await fireLeadCapi(traceId, email, phone, name, amount, ipL, uaL, body.fbclid || '', fbpL);
    if (SUPABASE_READY && capiResL.sent) {
      await supabase.from('bex_events')
        .update({ fb_capi_sent_at: new Date().toISOString(), fb_capi_status: (capiResL as any).status, fb_capi_response: (capiResL as any).body })
        .eq('tx_id', traceId).eq('event_type', 'lead');
    }
    console.log('[create-payment lead-only] capi=%j', capiResL);
    res.setHeader('Cache-Control', 's-maxage=0, no-store');
    return res.status(200).json({ traceId, amount, lead_only: true });
  }

  const cardcomPayload: Record<string, any> = {
    TerminalNumber: Number(TerminalNumber),
    ApiName,
    ApiPassword,
    Operation: 'ChargeOnly',
    Amount: amount,
    CoinId: 1,
    Language: 'he',
    ProductName: isTestMode ? 'TEST - קורס ששווה מיליונים' : 'קורס ששווה מיליונים — סדנת לייב',
    ReturnValue: traceId,
    SuccessRedirectUrl: `${origin}/?status=success&tx=${traceId}&amount=${amount}&v=${encodeURIComponent(variant)}`,
    FailedRedirectUrl: `${origin}/?status=failed&tx=${traceId}&v=${encodeURIComponent(variant)}`,
    WebHookUrl: `${origin}/api/cardcom-webhook?tx=${traceId}`,
    Document: {
      Name: name,
      Email: email,
      Mobile: phone,
      Products: [{
        Description: isTestMode ? 'TEST - 1 ש"ח' : 'קורס ששווה מיליונים — סדנת לייב',
        Quantity: 1,
        UnitCost: amount,
      }],
    },
    UIDefinition: {
      HideCardOwnerName: false,
      HideCardOwnerEmail: false,
      HideCardOwnerPhone: false,
      IsHideContinueOnFailure: false,
      CardOwnerName: name,
      CardOwnerEmail: email,
      CardOwnerPhone: phone,
    },
    ISOCoinId: 1,
  };

  try {
    const cardcomRes = await fetch(CARDCOM_LP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(cardcomPayload),
    });
    const data = await cardcomRes.json();
    if (data.ResponseCode !== 0 || !data.Url) {
      console.error('[create-payment] cardcom_error', { code: data.ResponseCode, desc: data.Description, traceId });
      return res.status(502).json({ error: 'cardcom_create_failed', code: data.ResponseCode, description: data.Description });
    }

    // Insert lead row into Supabase. Must AWAIT or Vercel kills the Lambda before insert resolves.
    if (SUPABASE_READY) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
      const ua = (req.headers['user-agent'] as string) || '';
      const { error: supaErr } = await supabase.from('bex_events').insert({
        tx_id: traceId,
        event_type: 'lead',
        name,
        email,
        phone,
        variant,
        amount,
        price_nis: amount,
        workshop_date: body.workshop_date || null,
        workshop_time: body.workshop_time || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        fbclid: body.fbclid || null,
        gclid: body.gclid || null,
        referrer: body.referrer || null,
        page_url: body.page_url || null,
        user_agent: ua,
        ip,
        status: 'pending_payment',
        consent_marketing: Boolean(body.consent_marketing),
        consent_at: body.consent_at || new Date().toISOString(),
        raw_payload: { test_mode: isTestMode, source: 'create-payment', body },
      });
      if (supaErr) console.error('[create-payment] supabase_insert_error', supaErr.message);
    }
    // Fire server-side Lead CAPI (test path also benefits from coverage)
    const ipT = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || '';
    const uaT = (req.headers['user-agent'] as string) || '';
    const fbpT = (req.headers.cookie || '').match(/_fbp=([^;]+)/)?.[1] || '';
    const capiResT = await fireLeadCapi(traceId, email, phone, name, amount, ipT, uaT, body.fbclid || '', fbpT);
    if (SUPABASE_READY && capiResT.sent) {
      await supabase.from('bex_events')
        .update({ fb_capi_sent_at: new Date().toISOString(), fb_capi_status: (capiResT as any).status, fb_capi_response: (capiResT as any).body })
        .eq('tx_id', traceId).eq('event_type', 'lead');
    }
    console.log('[create-payment] capi=%j', capiResT);

    res.setHeader('Cache-Control', 's-maxage=0, no-store');
    return res.status(200).json({ url: data.Url, lowProfileId: data.LowProfileId, traceId, amount, test_mode: isTestMode });
  } catch (e: any) {
    console.error('[create-payment] network_error', e?.message, traceId);
    return res.status(502).json({ error: 'network_error', message: e?.message });
  }
}
