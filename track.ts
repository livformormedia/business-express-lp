// First-party page analytics → /api/track. Never throws into the page.
// Records: landing (session), max scroll depth, engaged seconds, reached-form, converted.
export function initBexTrack() {
  if (typeof window === 'undefined') return;
  try {
    const p = new URLSearchParams(window.location.search);
    let sid = '';
    try { sid = sessionStorage.getItem('bex_sid') || ''; } catch { /* private mode */ }
    if (!sid) {
      sid = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem('bex_sid', sid); } catch { /* ignore */ }
    }

    const meta = {
      session_id: sid,
      variant: p.get('v') || 'a',
      utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '', utm_campaign: p.get('utm_campaign') || '',
      utm_content: p.get('utm_content') || '', utm_term: p.get('utm_term') || '',
      fbclid: p.get('fbclid') || '', gclid: p.get('gclid') || '',
      referrer: document.referrer || '', page_url: location.href, page_path: location.pathname,
      device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    };

    let maxScroll = 0, engaged = 0, reachedForm = false, converted = false;
    let lastScroll = -1, lastEngaged = 0, lastRF = false, lastConv = false, sentFinal = false;

    function scrollPct(): number {
      const h = document.documentElement;
      const denom = h.scrollHeight - h.clientHeight;
      if (denom <= 0) return 100;
      return Math.round(((window.scrollY || h.scrollTop) / denom) * 100); // true scroll depth (0 at top)
    }
    function send(beacon: boolean) {
      const payload = JSON.stringify(Object.assign({}, meta, { scroll_pct: maxScroll, engaged_seconds: engaged, reached_form: reachedForm, converted }));
      try {
        if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
        else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
      } catch { /* ignore */ }
      lastScroll = maxScroll; lastEngaged = engaged; lastRF = reachedForm; lastConv = converted;
    }
    function changed() { return maxScroll > lastScroll || reachedForm !== lastRF || converted !== lastConv || (engaged - lastEngaged) >= 30; }
    function sendFinal() { if (sentFinal) return; sentFinal = true; send(true); }
    function markForm() { if (!reachedForm) { reachedForm = true; send(true); } }

    let t: any;
    function onScroll() {
      clearTimeout(t);
      t = setTimeout(function () {
        const pc = Math.max(0, Math.min(100, scrollPct()));
        if (pc > maxScroll) maxScroll = pc;
      }, 150);
    }

    send(false);                                                  // landing
    setInterval(function () { if (document.visibilityState === 'visible') engaged += 1; }, 1000);
    setInterval(function () { if (changed()) send(false); }, 15000);  // flush only when something meaningful changed
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    document.addEventListener('focusin', function (e: any) { const tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') markForm(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sendFinal(); });
    window.addEventListener('pagehide', sendFinal);

    (window as any).bexTrack = {
      markConverted: function () { converted = true; reachedForm = true; send(true); },
      markReachedForm: markForm,
    };
  } catch { /* analytics must never break the page */ }
}
