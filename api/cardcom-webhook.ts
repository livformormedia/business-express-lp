import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FB_GRAPH = 'https://graph.facebook.com/v18.0';

// SHA256 hash for FB CAPI user-data normalization (lowercase, trimmed)
const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
const normPhone = (p: string) => p.replace(/\D/g, ''); // digits only, no leading +
const toUnix = () => Math.floor(Date.now() / 1000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cardcom posts JSON. Accept POST + GET for flexibility (Cardcom sometimes uses GET callbacks).
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Combine query + body — Cardcom v11 LP webhook payload structure varies by config
  const payload: any = { ...(req.query || {}), ...(typeof req.body === 'object' ? req.body : {}) };

  // Extract key fields. Cardcom v11 returns either { ResponseCode, TranzactionInfo, DocumentInfo, ReturnValue } or flat fields
  const responseCode = Number(payload.ResponseCode ?? payload.responseCode ?? payload?.TranzactionInfo?.ResponseCode);
  const returnValue = payload.ReturnValue ?? payload.returnValue ?? payload.tx ?? `bex-${Date.now()}`;
  const amount = Number(payload?.TranzactionInfo?.Amount ?? payload?.Amount ?? payload?.amount ?? 297);

  // Cardcom v11 puts buyer contact in TranzactionInfo when iframe form collected them (our config: HideCardOwnerEmail/Phone=false).
  // DocumentInfo is only populated when Operation=ChargeAndCreateDocument. We use ChargeOnly, so prefer TranzactionInfo.
  const ti = payload?.TranzactionInfo ?? {};
  const di = payload?.DocumentInfo ?? {};
  const ui = payload?.UIValues ?? {};
  const email: string = ti?.CardOwnerEmail ?? di?.Email ?? ui?.CardOwnerEmail ?? payload?.email ?? '';
  const phone: string = ti?.CardOwnerPhone ?? di?.Phone ?? ui?.CardOwnerPhone ?? payload?.phone ?? '';
  const fullName: string = ti?.CardOwnerName ?? di?.FullName ?? ui?.CardOwnerName ?? '';
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(' ');

  // Log raw payload + extracted fields so we can verify on first real transaction
  console.log('[cardcom-webhook] tx=%s rc=%s amount=%s email=%s phone=%s name=%s',
    returnValue, responseCode, amount, email ? '✓' : '✗', phone ? '✓' : '✗', fullName ? '✓' : '✗');
  console.log('[cardcom-webhook] raw=%j', payload);

  // Supabase: log every IPN (success or failure) for full audit trail
  if (SUPABASE_READY) {
    const isSuccessLog = responseCode === 0;
    // Match strategy: if returnValue starts with 'bex-' it's our traceId. Otherwise (PaymentSP page),
    // match by email — find most recent pending lead with same email, attach its tx_id.
    let matchedTxId = String(returnValue);
    const looksLikeOurTraceId = /^bex-\d{10,}-[a-z0-9]+$/i.test(matchedTxId);
    if (!looksLikeOurTraceId && email) {
      const { data: leadMatch } = await supabase
        .from('bex_events')
        .select('tx_id')
        .eq('event_type', 'lead')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(1);
      if (leadMatch && leadMatch[0]?.tx_id) {
        matchedTxId = leadMatch[0].tx_id;
        console.log('[cardcom-webhook] matched by email → tx_id=%s', matchedTxId);
      }
    }
    // Insert purchase event row (or failed) using matched tx_id
    const { error: insErr } = await supabase.from('bex_events').insert({
      tx_id: matchedTxId,
      event_type: isSuccessLog ? 'purchase' : 'failed',
      name: fullName,
      email,
      phone,
      amount,
      status: isSuccessLog ? 'paid' : 'failed',
      cardcom_response_code: responseCode,
      raw_payload: { source: 'cardcom-webhook', payload, original_return_value: String(returnValue) },
    });
    if (insErr) console.error('[cardcom-webhook] supabase_insert_error', insErr.message);
    // Update the matching lead row → flip status
    const { error: updErr } = await supabase.from('bex_events')
      .update({ status: isSuccessLog ? 'paid' : 'failed', cardcom_response_code: responseCode })
      .eq('tx_id', matchedTxId)
      .eq('event_type', 'lead');
    if (updErr) console.error('[cardcom-webhook] supabase_update_error', updErr.message);
  }

  // Only forward Purchase event on success (responseCode === 0)
  const isSuccess = responseCode === 0;
  if (!isSuccess) {
    return res.status(200).json({ ok: true, forwarded: false, reason: 'not_success', responseCode });
  }

  const PIXEL_ID = process.env.BE_FB_PIXEL_ID;
  const TOKEN = process.env.BE_FB_CAPI_TOKEN;
  if (!PIXEL_ID || !TOKEN) {
    console.error('[cardcom-webhook] missing FB env vars');
    return res.status(200).json({ ok: true, forwarded: false, reason: 'fb_creds_missing' });
  }

  // Build CAPI Purchase event
  const userData: Record<string, any> = {};
  if (email) userData.em = [sha256(email)];
  if (phone) userData.ph = [sha256(normPhone(phone))];
  if (firstName) userData.fn = [sha256(firstName)];
  if (lastName) userData.ln = [sha256(lastName)];
  userData.client_ip_address = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  userData.client_user_agent = req.headers['user-agent'] as string;

  const fbPayload = {
    data: [{
      event_name: 'Purchase',
      event_time: toUnix(),
      event_id: String(returnValue),           // dedup with client Pixel event firing same eventID
      action_source: 'website',
      event_source_url: 'https://businessexpress.livformor.com/',
      user_data: userData,
      custom_data: {
        value: amount,
        currency: 'ILS',
        content_name: 'Course Worth Millions Workshop',
        content_ids: ['bex-workshop-197'],
        content_type: 'product',
        num_items: 1,
      },
    }],
  };

  // Fire FB CAPI + the SINGLE purchase Make hook (l14042a8 — Lilach's scenario). Raw Cardcom payload, same shape as always.
  const PURCHASE_MAKE_HOOK = 'https://hook.eu2.make.com/l14042a8dqfswoa3b0mh69i9qhtx9hp9';
  const makePromise = fetch(PURCHASE_MAKE_HOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // verbatim Cardcom IPN payload
  }).catch((e) => { console.error('[cardcom-webhook] make_post_error', e?.message); return null; });

  try {
    const [fbRes] = await Promise.all([
      fetch(`${FB_GRAPH}/${PIXEL_ID}/events?access_token=${TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbPayload),
      }),
      makePromise,
    ]);
    const fbBody = await fbRes.json();
    console.log('[cardcom-webhook] fb-capi status=%s body=%j', fbRes.status, fbBody);
    // Patch the purchase row w/ CAPI status (audit trail)
    if (SUPABASE_READY) {
      await supabase.from('bex_events')
        .update({ fb_capi_sent_at: new Date().toISOString(), fb_capi_status: fbRes.status, fb_capi_response: fbBody })
        .eq('tx_id', String(returnValue))
        .eq('event_type', 'purchase');
    }

    return res.status(200).json({
      ok: true,
      forwarded: true,
      event_id: returnValue,
      fb_status: fbRes.status,
      fb_response: fbBody,
    });
  } catch (e: any) {
    console.error('[cardcom-webhook] fb-capi network error', e);
    return res.status(200).json({ ok: true, forwarded: false, reason: 'fb_network_error', error: e?.message });
  }
}
