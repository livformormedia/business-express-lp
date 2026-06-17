import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Safety net: poll Cardcom Transactions every 5 min, reconcile against Supabase.
// Catches purchases where the IPN webhook failed/never configured.
//
// Auth: Vercel cron sets `Authorization: Bearer <CRON_SECRET>` header.

const SUPABASE_READY = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FB_GRAPH = 'https://graph.facebook.com/v18.0';
const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
const normPhone = (p: string) => p.replace(/\D/g, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: allow Vercel cron (Bearer <CRON_SECRET>) OR manual call w/ admin password
  const cronSecret = process.env.CRON_SECRET;
  const adminPwd = process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.authorization || '';
  const ok =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (adminPwd && authHeader === `Bearer ${adminPwd}`) ||
    (req.query?.key && req.query.key === adminPwd);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });

  if (!SUPABASE_READY) return res.status(500).json({ error: 'supabase_not_configured' });

  const TerminalNumber = process.env.CARDCOM_TERMINAL_NUMBER;
  const ApiName = process.env.CARDCOM_API_NAME;
  const ApiPassword = process.env.CARDCOM_API_PASSWORD;
  if (!TerminalNumber || !ApiName || !ApiPassword) {
    return res.status(500).json({ error: 'cardcom_credentials_missing' });
  }

  // Cardcom filters by ISRAEL date (UTC+3 IDT). Vercel runs UTC. Must compute dates in Israel time,
  // or transactions after Israel-midnight fall outside a UTC-computed date window. Bug fixed 2026-05-29.
  // DDMMYYYY format. Query yesterday→tomorrow (Israel) for a generous window; dedup handles overlap.
  const ddmmyyyy = (d: Date) => {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}${mm}${yyyy}`;
  };
  const ISRAEL_OFFSET_MS = 3 * 60 * 60 * 1000; // IDT = UTC+3
  const israelNow = new Date(Date.now() + ISRAEL_OFFSET_MS);
  const fromDate = ddmmyyyy(new Date(israelNow.getTime() - 24 * 60 * 60 * 1000)); // yesterday IL
  const toDate = ddmmyyyy(new Date(israelNow.getTime() + 24 * 60 * 60 * 1000));   // tomorrow IL

  let txList: any[] = [];
  try {
    const ccRes = await fetch('https://secure.cardcom.solutions/api/v11/Transactions/ListTransactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TerminalNumber: Number(TerminalNumber),
        ApiName,
        ApiPassword,
        FromDate: fromDate,
        ToDate: toDate,
        Page: 1,
        Page_size: 500,
      }),
    });
    const data = await ccRes.json();
    if (data.ResponseCode !== 0) {
      console.error('[cron-sync] cardcom_list_error', data);
      return res.status(502).json({ error: 'cardcom_list_failed', code: data.ResponseCode, description: data.Description });
    }
    txList = data.Tranzactions || data.Transactions || data.TranzactionList || [];
  } catch (e: any) {
    console.error('[cron-sync] cardcom_network_error', e?.message);
    return res.status(502).json({ error: 'cardcom_network_error', message: e?.message });
  }

  let reconciled = 0;
  let skipped = 0;
  const details: any[] = [];

  for (const tx of txList) {
    const cardcomTxId = String(tx.InternalDealNumber ?? tx.TranzactionId ?? tx.TransactionId ?? tx.InvoiceNumber ?? '');
    const responseCode = Number(tx.ResponseCode ?? 0);
    const amount = Number(tx.Amount ?? tx.SumPay ?? 0);
    const email = String(tx.CardOwnerEmail ?? tx.Email ?? '').toLowerCase().trim();
    const phone = String(tx.CardOwnerPhone ?? tx.Phone ?? '').trim();
    const fullName = String(tx.CardOwnerName ?? tx.Name ?? '').trim();
    if (!cardcomTxId || responseCode !== 0) {
      skipped++;
      continue;
    }
    // Check if we already have this Cardcom tx in Supabase
    const { data: existing } = await supabase
      .from('bex_events')
      .select('id')
      .eq('event_type', 'purchase')
      .filter('raw_payload->>original_return_value', 'eq', cardcomTxId)
      .limit(1);
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    // WORKSHOP-PURCHASE FILTER: only the workshop's prices fire (isolates this campaign from other BEX products).
    // Real workshop amounts: 197 (early), 297 (full), +97 recordings upsell = 294 / 394.
    // Skips test transactions (0, 1 NIS) and other-product prices (1000, 2000...).
    const REAL_AMOUNTS = [197, 294, 297, 394];
    if (!REAL_AMOUNTS.includes(amount)) { skipped++; continue; }
    if (!email) { skipped++; continue; } // need email for confirmation + CAPI

    // Match to a form-lead for ATTRIBUTION (UTM/variant) — optional, never blocks the confirmation.
    // Terminal is BEX-only, so every workshop-price success is a real customer who must get confirmation.
    const { data: leadMatch } = await supabase
      .from('bex_events')
      .select('tx_id')
      .eq('event_type', 'lead')
      .eq('email', email)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(1);
    const matchedTxId = leadMatch && leadMatch[0]?.tx_id ? leadMatch[0].tx_id : `cc-${cardcomTxId}`;
    // Insert purchase row
    const { error: insErr } = await supabase.from('bex_events').insert({
      tx_id: matchedTxId,
      event_type: 'purchase',
      name: fullName,
      email,
      phone,
      amount,
      status: 'paid',
      cardcom_response_code: responseCode,
      raw_payload: { source: 'cron-sync', cardcom_tx: tx, original_return_value: cardcomTxId },
    });
    if (insErr) {
      console.error('[cron-sync] insert error', insErr.message);
      continue;
    }
    // Update lead row → paid
    await supabase.from('bex_events')
      .update({ status: 'paid', cardcom_response_code: responseCode })
      .eq('tx_id', matchedTxId)
      .eq('event_type', 'lead');

    // Fire FB CAPI Purchase (server-side, deduped via event_id = matchedTxId)
    const PIXEL_ID = process.env.BE_FB_PIXEL_ID;
    const TOKEN = process.env.BE_FB_CAPI_TOKEN;
    let capiStatus: number | null = null;
    let capiBody: any = null;
    if (PIXEL_ID && TOKEN && amount > 0 && email) {
      const userData: Record<string, any> = {};
      if (email) userData.em = [sha256(email)];
      if (phone) userData.ph = [sha256(normPhone(phone))];
      const [fn, ...rest] = fullName.split(/\s+/);
      if (fn) userData.fn = [sha256(fn)];
      if (rest.length) userData.ln = [sha256(rest.join(' '))];
      try {
        const fbRes = await fetch(`${FB_GRAPH}/${PIXEL_ID}/events?access_token=${TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              event_name: 'Purchase',
              event_time: (() => {
                // Cardcom's CreateDate has no timezone → Node parses as UTC, results in future-looking time (Israel is UTC+3).
                // Clamp to min(parsed, now) so FB never rejects "event in future".
                const parsed = Math.floor(Date.parse(tx.CreateDate || tx.Date || new Date().toISOString()) / 1000);
                const now = Math.floor(Date.now() / 1000);
                return Math.min(parsed, now);
              })(),
              event_id: matchedTxId,
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
          }),
        });
        capiStatus = fbRes.status;
        capiBody = await fbRes.json();
        console.log('[cron-sync] fb-capi tx=%s status=%s body=%j', matchedTxId, capiStatus, capiBody);
        // Patch the purchase row we just inserted with CAPI status (find by tx_id + source=cron-sync)
        await supabase.from('bex_events')
          .update({ fb_capi_sent_at: new Date().toISOString(), fb_capi_status: capiStatus, fb_capi_response: capiBody })
          .eq('tx_id', matchedTxId)
          .eq('event_type', 'purchase');
      } catch (e: any) {
        console.error('[cron-sync] fb-capi error', e?.message);
      }
    }

    // Fire ONLY the purchase Make hook (l14042a8 — the scenario Lilach maintains). Same raw Cardcom shape it always got.
    // Single webhook, no double-fire.
    const PURCHASE_MAKE = 'https://hook.eu2.make.com/l14042a8dqfswoa3b0mh69i9qhtx9hp9';
    await fetch(PURCHASE_MAKE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tx, ResponseCode: 0, ReturnValue: matchedTxId, TranzactionInfo: tx, DocumentInfo: {}, UIValues: {} }),
    }).catch((e) => { console.error('[cron-sync] purchase_make_error', e?.message); return null; });

    reconciled++;
    details.push({ cardcom_tx: cardcomTxId, tx_id: matchedTxId, email, amount, capi_status: capiStatus });
  }

  return res.status(200).json({
    ok: true,
    checked: txList.length,
    reconciled,
    skipped,
    window: { fromDate, toDate },
    details,
  });
}
