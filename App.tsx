import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  XCircle,
  HelpCircle,
  ChevronsLeft,
  ShieldCheck,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from 'lucide-react';

// FREE 4-day live mini-course — no payment flow. All CTAs point to #register.
const REGISTER_ANCHOR = '#register';
const WORKSHOP_DATE_ISO = '2026-06-28T20:00:00+03:00';


const useCountdown = (target: string) => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const t = new Date(target).getTime();
    const tick = () => {
      const diff = t - Date.now();
      if (diff <= 0) { setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
};

// Sticky top — countdown only, centered, bigger (Oriel 25/5)
const StickyTop = ({ target }: { target: string }) => {
  const { days, hours, minutes, seconds } = useCountdown(target);

  const Cell = ({ n, l }: { n: number, l: string }) => (
    <div className="bg-white rounded-lg px-3 md:px-4 py-1.5 md:py-2 min-w-[56px] md:min-w-[80px] text-center shadow-sm">
      <div className="font-display font-bold text-brand-navy text-xl md:text-3xl leading-none tabular-nums">{n.toString().padStart(2, '0')}</div>
      <div className="text-[10px] md:text-xs text-brand-navy/70 leading-none mt-1 font-bold">{l}</div>
    </div>
  );

  return (
    <div className="sticky top-0 z-40 shadow-lg">
      <div className="bg-brand-navyDark border-b-4 border-brand-orange py-2.5 md:py-3.5">
        <div className="container mx-auto px-3 md:px-12 flex items-center justify-center gap-3 md:gap-5 flex-wrap">
          <span className="text-white font-display font-bold whitespace-nowrap" style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.4rem)' }}>האתגר מתחיל בעוד:</span>
          <div className="flex gap-1 md:gap-1.5" dir="ltr">
            <Cell n={days} l="ימים" />
            <Cell n={hours} l="שעות" />
            <Cell n={minutes} l="דק׳" />
            <Cell n={seconds} l="שנ׳" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable CTA pill. Defaults to the #register anchor (free lead form).
const CTAPill = ({
  label,
  size = 'lg',
  href = REGISTER_ANCHOR,
  external = false,
}: {
  label: string,
  size?: 'md' | 'lg' | 'xl',
  href?: string,
  external?: boolean,
}) => {
  const sizes = {
    md: 'px-6 py-3 text-base md:text-lg',
    lg: 'px-8 md:px-12 py-4 md:py-5 text-lg md:text-2xl',
    xl: 'px-10 md:px-16 py-5 md:py-7 text-xl md:text-3xl',
  };
  const props = external ? { target: '_blank', rel: 'noopener' } : {};
  return (
    <a href={href} {...props} className={`cta-pill inline-flex items-center justify-center gap-3 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-full font-display font-bold border-2 border-brand-orangeDark ${sizes[size]}`}>
      <ChevronsLeft className="shrink-0" size={size === 'xl' ? 32 : size === 'lg' ? 28 : 22} strokeWidth={3} />
      {label}
    </a>
  );
};

// Floating CTA — fresh rebuild. IntersectionObserver shows after sentinel. scrollIntoView relies on html scroll-padding-top (index.css).
const FloatingCTA = () => {
  const [pastTrigger, setPastTrigger] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const show = pastTrigger && !formInView;
  useEffect(() => {
    const trigger = document.getElementById('floating-cta-trigger');
    const onScroll = () => {
      if (trigger && trigger.getBoundingClientRect().top < 0) setPastTrigger(true);
    };
    if (trigger) {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    // Hide CTA when any RegistrationForm section is in viewport (interferes w/ form interaction)
    const formIds = ['register', 'register-top', 'register-bottom'];
    const forms = formIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    let visibleCount = 0;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visibleCount++;
        else visibleCount = Math.max(0, visibleCount - 1);
      }
      setFormInView(visibleCount > 0);
    }, { threshold: 0.15 });
    forms.forEach((f) => observer.observe(f));
    return () => {
      if (trigger) window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const goToRegister = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = document.getElementById('register');
    if (!target) return;
    // Smooth scroll first
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Re-correct after layout settles (lazy images can shift content during smooth scroll)
    setTimeout(() => {
      const t = document.getElementById('register');
      if (t) t.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 700);
  };

  return (
    <div className={`fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 px-3 w-full max-w-[640px] ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
      <button
        type="button"
        onClick={goToRegister}
        data-cta="floating-register"
        className="cta-pill w-full flex items-center justify-center gap-3 md:gap-4 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl md:rounded-full font-display font-bold border-2 border-brand-orangeDark px-5 md:px-8 py-3 md:py-4 shadow-2xl text-center"
      >
        <ChevronsLeft size={26} strokeWidth={3} className="shrink-0" />
        <span className="flex flex-col items-center text-center leading-tight gap-0.5">
          <span className="text-base md:text-xl">שריינו את המקום שלכם בחינם</span>
          <span className="text-xs md:text-sm font-normal text-white/90">4 ימים בלייב · ללא עלות · ללא הגבלת מקומות</span>
        </span>
      </button>
    </div>
  );
};

// Reusable guarantee card — used twice: after 6-modules and again before FAQ
const GuaranteeCard = () => (
  <div className="bg-gradient-to-br from-brand-orange/5 to-brand-cream rounded-3xl border-2 border-brand-orange p-8 md:p-10 relative overflow-hidden">
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-orange/15 rounded-full blur-3xl"></div>
    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative">
      <div className="shrink-0">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white border-4 border-brand-orange flex items-center justify-center shadow-xl">
          <ShieldCheck size={64} className="text-brand-orange" strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-center md:text-right flex-1">
        <p className="text-brand-orange font-display font-bold text-base md:text-lg tracking-[0.2em] uppercase mb-2">מה יש לכם להפסיד?</p>
        <h3 className="font-display font-bold text-brand-navy leading-tight mb-4" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
          במקרה הכי גרוע?<br />
          <span className="text-brand-orange">הפסדתם חצי שעה.</span>
        </h3>
        <p className="text-brand-muted text-base md:text-xl leading-relaxed mb-4">
          תגיעו לשידור הראשון, תחשבו שזה חרטה ברטה, ותמשיכו בחייכם.
        </p>
        <p className="text-brand-navy font-display font-bold text-base md:text-xl leading-relaxed">
          במקרה הכי טוב? תבינו איך להשתמש בכישורים והניסיון שכבר יש לכם בכדי לייצר הכנסה של 5,000–8,000 ש"ח שתשמש לכם ולמשפחה שלכם ככרית ביטחון כלכלית בתוך 60 יום.
        </p>
      </div>
    </div>
  </div>
);

// Helper: collect UTMs + tracking IDs + meta from current URL + browser.
const collectTrackingData = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
    gclid: params.get('gclid') || '',
    fbclid: params.get('fbclid') || '',
    referrer: document.referrer || '',
    landing_url: window.location.href,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    variant: params.get('v') || 'a',
    page_path: window.location.pathname,
    test_key: params.get('test_key') || '',
  };
};

const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/5glwvheb1iyca9vp947qvrva274g18vw';

// RegistrationForm — FREE lead capture for the 4-day live challenge. No payment.
const RegistrationForm = ({ id }: { id: string }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('כל השדות חובה');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('אימייל לא תקין');
      return;
    }
    if (!/^[0-9\-+\s()]{7,}$/.test(phone)) {
      setError('טלפון לא תקין');
      return;
    }
    if (!consent) {
      setError('יש לאשר קבלת הודעות בערוצי תקשורת');
      return;
    }
    setSubmitting(true);
    const tracking = collectTrackingData();
    const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      challenge_date: '2026-06-28',
      challenge_time: '20:00',
      timestamp_iso: new Date().toISOString(),
      ...tracking,
    };

    try {
      // Fire FB Pixel Lead — free offer, value 0 (no purchase value).
      try {
        const fbq = (window as any).fbq;
        if (typeof fbq === 'function') {
          fbq('track', 'Lead', {
            value: 0,
            currency: 'ILS',
            content_name: 'Esek LeKulam 4-Day Free Challenge',
          }, { eventID: eventId });
        }
      } catch { /* ignore */ }

      // POST to Make webhook (fire-and-forget) — lead only, no payment.
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'lead', ...userPayload, fb_event_id: eventId, consent_marketing: consent, consent_at: new Date().toISOString() }),
      }).catch(() => { /* swallow */ });

      setSubmitting(false);
      setDone(true);
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message ? `שגיאה: ${err.message}` : 'שגיאה לא צפויה. נסה שוב.');
    }
  };

  return (
    <section id={id} className="bg-brand-navy text-white py-10 md:py-14">
      <div className="container mx-auto px-5 md:px-12 max-w-2xl">
        <div className="text-center mb-7 md:mb-9">
          <p className="text-brand-orange font-display font-bold text-sm md:text-lg tracking-[0.25em] uppercase mb-3">ללא עלות · ללא הגבלת מקומות</p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 md:gap-4 bg-white/10 text-white font-display font-bold px-5 md:px-8 py-3 md:py-4 rounded-full" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.5rem)' }}>
            <span className="text-brand-orange">📅</span>
            <span>28–31.6</span>
            <span className="text-brand-orange">·</span>
            <span>20:00 בערב</span>
            <span className="text-brand-orange">·</span>
            <span>בלייב בזום</span>
          </div>
        </div>

        {done ? (
          <div className="bg-white text-brand-navy rounded-2xl p-8 md:p-10 shadow-2xl text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 rounded-full bg-brand-orange flex items-center justify-center shadow-lg">
              <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-bold text-2xl md:text-3xl mb-2">נרשמתם בהצלחה!</h3>
            <p className="text-brand-muted text-base md:text-xl leading-relaxed">
              שלחנו לכם את כל הפרטים והקישור לזום למייל. נתראה ב-28.6 בשעה 20:00.
            </p>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="bg-white text-brand-navy rounded-2xl p-6 md:p-8 shadow-2xl space-y-4" noValidate>
          <h3 className="font-display font-bold text-center text-xl md:text-2xl leading-tight mb-3">
            שריינו את המקום שלכם בחינם ⬇️
          </h3>
          <p className="text-center text-brand-navy/80 text-sm md:text-base leading-snug mb-4">
            מיני קורס בן 4 ימים בלייב, לשכירים ומשפחות שרוצות לייצר הכנסה נוספת מהידע שכבר קיים אצלכם, בלי לסכן שקל ובלי לעזוב את העבודה.
          </p>

          <div>
            <label className="block text-sm md:text-base font-display font-bold mb-1.5">שם מלא</label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-4 py-3 md:py-3.5 text-base md:text-lg rounded-xl border-2 border-brand-creamDark focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60"
              placeholder="ישראל ישראלי"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-display font-bold mb-1.5">אימייל</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              dir="ltr"
              className="w-full px-4 py-3 md:py-3.5 text-base md:text-lg rounded-xl border-2 border-brand-creamDark focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60 text-right"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-display font-bold mb-1.5">טלפון</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={submitting}
              dir="ltr"
              className="w-full px-4 py-3 md:py-3.5 text-base md:text-lg rounded-xl border-2 border-brand-creamDark focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60 text-right"
              placeholder="050-1234567"
            />
          </div>

          {/* IL Spam Law (סעיף 30א) consent — mandatory checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={submitting}
              required
              className="mt-1 w-5 h-5 accent-brand-orange flex-shrink-0 cursor-pointer"
              aria-required="true"
            />
            <span className="text-xs md:text-sm text-brand-navy/85 leading-snug">
              אני מאשר/ת קבלת תכנים שיווקיים, עדכונים, ופרסומים על תכניות נוספות של ביזנס אקספרס בכל ערוצי התקשורת (אימייל, SMS, WhatsApp ושיחה טלפונית), בהתאם ל<a href="/privacy.html" target="_blank" rel="noopener" className="underline text-brand-orange font-bold">מדיניות הפרטיות</a>. ניתן להסיר רישום בכל עת.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 rounded-xl px-4 py-3 text-base font-display font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cta-pill w-full flex items-center justify-center gap-3 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-full font-display font-bold border-2 border-brand-orangeDark px-7 py-4 md:py-5 text-lg md:text-2xl disabled:opacity-70 disabled:cursor-wait"
          >
            {submitting ? (
              <><Loader2 size={24} className="animate-spin" /> רושם אתכם...</>
            ) : (
              <><ChevronsLeft size={28} strokeWidth={3} /> אני רוצה להצטרף</>
            )}
          </button>

          <p className="text-center text-brand-muted text-xs md:text-sm mt-3">
            ✓ ללא עלות · ✓ אישור והקישור לזום נשלחים מיד למייל
          </p>
        </form>
        )}
      </div>
    </section>
  );
};

// Success / failed banner triggered by ?status=success|failed query param
const StatusBanner = () => {
  const [status, setStatus] = useState<'success' | 'failed' | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('status');
    const tx = params.get('tx') || `bex-${Date.now()}`;
    if (p === 'success' || p === 'failed') setStatus(p);

    // Free offer — fire a Lead event (value 0), no purchase value.
    if (p === 'success') {
      const fbq = (window as any).fbq;
      if (typeof fbq === 'function') {
        fbq('track', 'Lead', {
          value: 0,
          currency: 'ILS',
          content_name: 'Esek LeKulam 4-Day Free Challenge',
        }, { eventID: tx });
      }
    }
  }, []);
  if (!status) return null;
  const success = status === 'success';
  return (
    <div className={`sticky top-[60px] md:top-[72px] z-30 ${success ? 'bg-emerald-500' : 'bg-red-500'} text-white py-3 md:py-4 shadow-md`}>
      <div className="container mx-auto px-5 md:px-12 text-center font-display font-bold text-base md:text-xl">
        {success ? '🎉 ההרשמה הצליחה! הקישור לזום נשלח למייל שלך.' : '⚠️ משהו השתבש. אפשר לנסות שוב למטה.'}
      </div>
    </div>
  );
};

// Hormozi virtuous vs vicious price cycle.
// Interactive: hover row to scale arrows + highlight bg.
// `goodWhenUp` = true means "up arrow at premium side is the good outcome" (most rows).
// For "demandingness" row, premium DROPS demandingness (good) so the polarity reverses.
type CycleRow = { metric: string; goodWhenUp: boolean };

const CLIENT_ROWS: CycleRow[] = [
  { metric: 'כמה משלמים לך על אותו ידע',          goodWhenUp: true },
  { metric: 'הערך שמייחסים למה שאתה נותן',        goodWhenUp: true },
  { metric: 'החופש לבחור עם מי לעבוד',           goodWhenUp: true },
  { metric: 'תלות במעסיק אחד יחיד',              goodWhenUp: false },
  { metric: 'הכנסה לכל שעת עבודה',               goodWhenUp: true },
];

const BUSINESS_ROWS: CycleRow[] = [
  { metric: 'מה שנכנס הביתה בסוף החודש',          goodWhenUp: true },
  { metric: 'הביטחון הכלכלי של המשפחה',          goodWhenUp: true },
  { metric: 'תחושת הערך העצמי שלך',              goodWhenUp: true },
  { metric: 'שליטה בזמן ובלוז שלך',              goodWhenUp: true },
  { metric: 'אוויר לנשום בסוף החודש',            goodWhenUp: true },
];

const Arrow = ({ direction, good, size = 28 }: { direction: 'up' | 'down'; good: boolean; size?: number }) => {
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  const color = good ? 'text-emerald-600' : 'text-red-500';
  const bg = good ? 'bg-emerald-100' : 'bg-red-100';
  return (
    <div className={`inline-flex items-center justify-center rounded-full ${bg} w-12 h-12 md:w-14 md:h-14 transition-transform duration-200 group-hover:scale-125`}>
      <Icon size={size} className={color} strokeWidth={2.8} />
    </div>
  );
};

const CycleGroup = ({ title, rows }: { title: string; rows: CycleRow[] }) => (
  <div className="mb-8 last:mb-0">
    <h4 className="font-display font-bold text-brand-navy text-xl md:text-3xl text-center mb-5 md:mb-6">
      {title}
    </h4>
    <div className="rounded-2xl overflow-hidden border-2 border-brand-creamDark bg-white">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_2fr_1fr] md:grid-cols-[1fr_2.4fr_1fr] gap-1 md:gap-3 px-3 md:px-6 py-3 md:py-4 bg-brand-navy text-white text-center font-display font-bold text-xs md:text-base tracking-wide">
        <div className="text-emerald-300">כעצמאי</div>
        <div>המדד</div>
        <div className="text-red-300">כשכיר</div>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const premiumDir = row.goodWhenUp ? 'up' : 'down';
        const lowDir = row.goodWhenUp ? 'down' : 'up';
        return (
          <div
            key={i}
            className="group grid grid-cols-[1fr_2fr_1fr] md:grid-cols-[1fr_2.4fr_1fr] gap-1 md:gap-3 items-center px-3 md:px-6 py-4 md:py-5 border-t border-brand-creamDark hover:bg-emerald-50/40 transition-colors"
          >
            <div className="flex justify-center">
              <Arrow direction={premiumDir} good={true} />
            </div>
            <div className="text-center text-brand-ink text-sm md:text-xl font-medium leading-snug px-2">
              {row.metric}
            </div>
            <div className="flex justify-center">
              <Arrow direction={lowDir} good={false} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PriceCycleVisual = () => (
  <div className="bg-brand-cream rounded-3xl border-2 border-brand-creamDark p-5 md:p-10 shadow-md">
    <div className="text-center mb-7 md:mb-10">
      <h3 className="font-display font-bold text-brand-navy leading-tight" style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.8rem)' }}>
        מה קורה לאותו ידע בדיוק<br />
        כשמפסיקים למכור אותו בזול
      </h3>
    </div>

    <CycleGroup title="הידע שלך בשוק" rows={CLIENT_ROWS} />
    <CycleGroup title="אתה והמשפחה שלך" rows={BUSINESS_ROWS} />
  </div>
);

const AppA = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  // Force smooth scroll on every same-page anchor click (CSS alone gets blocked by overflow ancestors)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!t) return;
      const href = t.getAttribute('href');
      if (!href || href === '#') return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      // Smooth scroll + auto-correct (lazy images shift layout during smooth scroll)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const again = document.querySelector(href);
        if (again) again.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 700);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy overflow-x-clip pb-24 md:pb-28">

      <FloatingCTA />
      <StickyTop target={WORKSHOP_DATE_ISO} />
      <StatusBanner />

      {/* HEADER — minimal. CTA on the left in RTL. */}
      <header className="bg-brand-cream border-b border-brand-creamDark">
        <div className="container mx-auto px-5 md:px-12 py-2 md:py-3 flex justify-end items-center">
          <a href="#register" className="hidden md:inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orangeDark text-white px-5 py-2 rounded-full font-display font-bold text-sm transition-all shadow-md">
            <ChevronsLeft size={16} strokeWidth={3} />
            אני נרשם בחינם
          </a>
        </div>
      </header>

      {/* HERO — side-by-side desktop (img left, text right RTL), stacked mobile */}
      <section className="relative bg-brand-cream pt-4 md:pt-6 pb-10 md:pb-14 overflow-hidden">
        <div className="absolute inset-0 triangles-bg opacity-50 pointer-events-none"></div>
        <div className="container mx-auto px-5 md:px-12 relative max-w-7xl">

          {/* Kicker above hero — text-only tag, not button */}
          <p className="text-center font-display font-bold text-brand-orange tracking-[0.25em] uppercase mb-4 md:mb-6 text-sm md:text-base">
            לשכירים ומשפחות <span className="text-brand-navy/40 mx-2">·</span> מיני קורס לייב <span className="text-brand-navy/40 mx-2">·</span> ללא עלות
          </p>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* IMAGE — top on mobile, left on desktop (RTL: order-2 = left) */}
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-brand-creamDark">
                <picture>
                  <source media="(max-width: 768px)" srcSet="/images/hero-challenge.png" />
                  <source srcSet="/images/hero-challenge.png" />
                  <img
                    src="/images/hero-challenge.png"
                    alt="עובד שכיר מבין שהידע שלו שווה יותר ממה שמשלמים לו"
                    width={1600}
                    height={894}
                    className="w-full h-auto block"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>

            {/* TEXT — bottom on mobile, right on desktop (RTL: order-1 = right) */}
            <div className="order-2 lg:order-1 text-center lg:text-right">

            <h1 className="font-display text-brand-navy font-bold mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)' }}>
              איך להגדיל הכנסה למשפחה (<span className="text-brand-orange">בלי לסכן שקל</span>, ללמוד מקצוע חדש או להתפטר מהעבודה)
            </h1>
            <p className="text-lg md:text-2xl text-brand-muted mb-6 leading-relaxed">
              מיני קורס ללא עלות בן 4 ימים בלייב, לשכירים ומשפחות שמבינות שלייצר הכנסה נוספת זו לא המלצה אלא חובה ב-2026.
            </p>

            {/* Date pill — prominent for 40+ audience */}
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-3 mb-6 bg-brand-navy text-white font-display font-bold px-6 md:px-8 py-3 md:py-4 rounded-full shadow-xl" style={{ fontSize: 'clamp(1.05rem, 1.9vw, 1.5rem)' }}>
              <span className="text-brand-orange">📅</span>
              <span>28–31.6</span>
              <span className="text-brand-orange">·</span>
              <span>20:00 בערב</span>
              <span className="text-brand-orange">·</span>
              <span>בלייב</span>
              <span className="text-brand-orange">·</span>
              <span>ללא עלות</span>
            </div>

            <ul className="space-y-3 mb-6 max-w-xl mx-auto lg:mx-0 text-right">
              {[
                'תגלו איך לייצר הכנסה נוספת מהניסיון והידע שכבר קיים אצלכם, בלי ללמוד מקצוע חדש.',
                'תגלו איך לעשות את זה בלי לסכן שקל אחד.',
                'ללא עלות, ללא הגבלת מקומות, סה״כ 30 דקות הדרכה ביום, למשך 4 ימים.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-base md:text-lg text-brand-ink">
                  <span className="shrink-0 mt-0.5 w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-orange text-white flex items-center justify-center">
                    <CheckCircle2 size={16} strokeWidth={3} />
                  </span>
                  <span className="leading-snug font-normal">{t}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center lg:items-start gap-2 mb-2 mt-7">
              <CTAPill label="שריינו את המקום שלכם בחינם" size="lg" href="#register" external={false} />
              <p className="text-brand-muted text-sm md:text-base">בהנחיית אפרת קולברג וארזית נחום</p>
            </div>
            </div>
          </div>
        </div>
      </section>



      {/* Sentinel — FloatingCTA shows after scrolling past this point */}
      <div id="floating-cta-trigger" aria-hidden="true" className="h-0 w-0 invisible" />

      {/* FOUNDER CREDIBILITY — Efrat + Arzit, "we were employees too" */}
      <section className="relative bg-brand-navyDark text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(224,87,38,0.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(224,87,38,0.2), transparent 55%)`
        }}></div>
        <div className="container mx-auto px-5 md:px-12 relative max-w-4xl">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-base md:text-xl font-bold text-brand-orange tracking-[0.3em] uppercase mb-4">מי אנחנו?</p>
            <h2 className="font-display font-bold leading-[1.05] mb-2" style={{ fontSize: 'clamp(2rem, 4.6vw, 4.4rem)' }}>
              גם אנחנו <span className="text-brand-orange">היינו שכירות.</span>
            </h2>
          </div>

          {/* Founder portraits */}
          <div className="flex flex-wrap justify-center gap-5 md:gap-8 mb-10">
            <div className="text-center">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-brand-orange shadow-xl mx-auto">
                <img src="/images/efrat.jpg" alt="אפרת קולברג" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="font-display font-bold text-lg md:text-xl mt-3">אפרת קולברג</p>
            </div>
            <div className="text-center">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-brand-orange shadow-xl mx-auto">
                <img src="/images/arzit.jpg" alt="ארזית נחום" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="font-display font-bold text-lg md:text-xl mt-3">ארזית נחום</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-3xl border border-white/15 p-7 md:p-12 max-w-3xl mx-auto">
            <div className="text-lg md:text-2xl text-white/90 leading-relaxed space-y-4 text-right">
              <p>אנחנו אפרת קולברג וארזית נחום, ושתינו היינו שכירות.</p>
              <p>
                ארזית ניהלה את השיווק בחברת DHL תמורת <strong className="text-white">12,000 ש"ח בחודש</strong>, עד שפיטרו אותה, ואותו ידע בדיוק התחיל להכניס לה <strong className="text-brand-orange">950 ש"ח על שעת ייעוץ אחת</strong>.
              </p>
              <p>היום אנחנו מנהלות יחד חברת ייעוץ עסקי, ובשנה האחרונה ליווינו מאות אנשים.</p>
              <p className="font-display font-bold text-white">
                עכשיו אנחנו לוקחות את כל מה שלמדנו, ומלמדות אתכם איך לעשות בדיוק את אותו הדבר, צעד אחר צעד.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <CTAPill label="שריינו את המקום שלכם בחינם" size="lg" href="#register" external={false} />
          </div>
        </div>
      </section>

      {/* 4 CHALLENGE DAYS */}
      <section id="modules" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-5 md:px-12">
          <div className="text-center mb-14">
            <p className="text-base md:text-xl font-bold text-brand-orange tracking-[0.3em] uppercase mb-4">מה נלמד ב-4 הימים?</p>
            <h2 className="font-display font-bold text-brand-navy leading-[1.05]" style={{ fontSize: 'clamp(2.4rem, 5vw, 5.5rem)' }}>
              4 ימים, 30 דקות ביום,{' '}<br />
              <span className="text-brand-orange">צעד אחר צעד.</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-5">
            {[
              { day: 'יום 1', benefit: 'זיהוי הכסף שמסתתר אצלך', purpose: 'איך לזהות תוך 60 דקות איזה ידע שלך יכול להפוך להכנסה נוספת.' },
              { day: 'יום 2', benefit: 'יותר כסף, פחות שעות', purpose: 'איך להפוך את הידע שלך למוצר שמוכנים לשלם לך עליו פי 5 ממה שהבוס שלך משלם לך.' },
              { day: 'יום 3', benefit: 'הלקוחות הראשונים', purpose: 'איך להביא את הלקוח הראשון בלי אתר ובלי לשים שקל אחד על מודעות.' },
              { day: 'יום 4', benefit: 'מודל 8 הצעדים', purpose: 'להכנסה נוספת יציבה של 5,000–8,000 ש"ח בחודש, צעד אחר צעד.' },
            ].map((item, i) => (
              <div key={i} className="bg-brand-cream rounded-2xl p-6 md:p-8 border-2 border-brand-creamDark hover:border-brand-orange transition-colors flex gap-4 md:gap-6">
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand-orange text-white flex items-center justify-center font-display font-bold text-base md:text-lg shadow-md text-center leading-tight">
                  {item.day}
                </div>
                <div className="text-right flex-1">
                  <h3 className="font-display font-bold text-brand-navy text-xl md:text-3xl mb-2 leading-snug">{item.benefit}</h3>
                  <p className="text-brand-muted text-base md:text-xl leading-relaxed">{item.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK REVERSAL + CTA */}
      <section id="guarantee" className="py-12 md:py-16 bg-brand-cream">
        <div className="container mx-auto px-5 md:px-12 max-w-4xl">
          <GuaranteeCard />
          <div className="text-center mt-10">
            <CTAPill label="שריינו את המקום שלכם בחינם" size="lg" href="#register" external={false} />
            <p className="text-brand-muted text-sm md:text-base mt-3">
              28–31.6 · 20:00 בערב · בלייב · ללא עלות
            </p>
          </div>
        </div>
      </section>

      {/* THE PROMISE */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-5 md:px-12 max-w-3xl text-center">
          <p className="text-xl md:text-3xl text-brand-ink leading-relaxed">
            מה שאתם כבר יודעים לעשות שווה כסף. <span className="font-display font-bold text-brand-navy">הרבה יותר ממה שהבוס משלם לכם עליו.</span> ב-4 ערבים נראה לכם איך להפוך את זה ל-<span className="text-brand-orange font-display font-bold">5,000–8,000 ש"ח בחודש.</span>
          </p>
        </div>
      </section>

      {/* TAX REASSURANCE */}
      <section className="py-16 md:py-24 bg-brand-cream">
        <div className="container mx-auto px-5 md:px-12 max-w-3xl text-center">
          <h2 className="font-display font-bold text-brand-navy leading-[1.1] mb-8" style={{ fontSize: 'clamp(1.9rem, 4.4vw, 3.6rem)' }}>
            "אבל אני אצטרך לפתוח עסק<br className="md:hidden" /> ולשלם מיסים?"
          </h2>
          <div className="text-lg md:text-2xl text-brand-ink leading-relaxed space-y-4 text-right max-w-2xl mx-auto">
            <p>שאלה טובה, וזה בדיוק הפחד שעוצר את רוב האנשים.</p>
            <p>אז בואו נרגיע אתכם: כן, בשלב מסוים פותחים עוסק פטור, וזה הרבה יותר פשוט וזול ממה שאתם מדמיינים, צעד אחר צעד, ואנחנו נלווה אתכם לאורך כל הדרך.</p>
            <p>אבל זה ממש לא הדבר הראשון.</p>
            <p className="font-display font-bold text-brand-navy">
              החלק המפחיד באמת הוא לא המיסים, הוא פשוט להבין קודם כל אם יש לכם בכלל משהו ששווה כסף. <span className="text-brand-orange">בדיוק את זה נעשה ביום הראשון.</span>
            </p>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-5 md:px-12 max-w-5xl">
          <h2 className="font-display font-bold text-brand-navy text-center leading-[1.05] mb-12" style={{ fontSize: 'clamp(2.2rem, 5vw, 5rem)' }}>
            זה <span className="text-brand-orange">בשבילכם?</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-brand-cream p-7 md:p-10 rounded-3xl border-2 border-brand-creamDark">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                  <XCircle size={28} strokeWidth={2.5} />
                </div>
                <h3 className="font-display font-bold text-2xl md:text-3xl text-brand-navy">לא בשבילכם אם…</h3>
              </div>
              <ul className="space-y-4 text-lg md:text-2xl text-brand-ink">
                <li className="flex gap-3"><span className="text-red-500 font-bold text-2xl shrink-0">✕</span> אתם מחפשים כפתור קסם או להתעשר מהר.</li>
                <li className="flex gap-3"><span className="text-red-500 font-bold text-2xl shrink-0">✕</span> לא מוכנים להשקיע אפילו שעה ביום.</li>
              </ul>
            </div>

            <div className="bg-brand-orange/10 p-7 md:p-10 rounded-3xl border-2 border-brand-orange relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/20 blur-3xl"></div>
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-14 h-14 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 size={28} strokeWidth={2.5} />
                </div>
                <h3 className="font-display font-bold text-2xl md:text-3xl text-brand-navy">בשבילכם אם…</h3>
              </div>
              <ul className="space-y-4 text-lg md:text-2xl text-brand-ink relative">
                <li className="flex gap-3"><span className="text-brand-orange font-bold text-2xl shrink-0">✓</span> אתם שכירים עם 10+ שנות ניסיון.</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold text-2xl shrink-0">✓</span> שתי משכורות נכנסות ועדיין צפוף בסוף החודש.</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold text-2xl shrink-0">✓</span> רוצים הכנסה נוספת אבל לא יודעים מאיפה להתחיל.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* REGISTRATION */}
      <RegistrationForm id="register" />

      {/* HIDDEN per Oriel 13/05 — redundant guarantee (already shown post-modules). Restore by uncommenting.
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-5 md:px-12 max-w-4xl">
          <GuaranteeCard />
        </div>
      </section>
      */}

      {/* FAQ */}
      <section className="py-14 md:py-20 bg-brand-cream">
        <div className="container mx-auto px-5 md:px-12 max-w-3xl">
          <h2 className="font-display font-bold text-brand-orange text-center leading-[1.05] mb-10" style={{ fontSize: 'clamp(2.2rem, 5vw, 5rem)' }}>
            איך זה <span className="text-brand-navy">עובד?</span>
          </h2>

          <div className="space-y-3">
            {[
              { q: 'מתי?', a: '28–31 ביוני, כל ערב ב-20:00.' },
              { q: 'כמה זמן?', a: '30 דקות ביום, 4 ימים.' },
              { q: 'איפה?', a: 'בלייב מהבית, דרך זום.' },
              { q: 'כמה זה עולה?', a: 'ללא עלות, וללא הגבלת מקומות.' },
              { q: 'תהיה הקלטה?', a: 'השידור בלייב בלבד. מי שלא מגיע, מפספס.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-brand-creamDark overflow-hidden hover:border-brand-orange transition-colors">
                <button onClick={() => toggleFaq(i)} className="w-full px-5 md:px-7 py-5 md:py-6 flex items-center justify-between text-right gap-4">
                  <span className={`font-display font-bold text-lg md:text-2xl flex-1 ${openFaq === i ? 'text-brand-orange' : 'text-brand-navy'}`}>{f.q}</span>
                  <div className={`p-2 md:p-2.5 rounded-full shrink-0 transition-colors ${openFaq === i ? 'bg-brand-orange text-white' : 'bg-white text-brand-orange border-2 border-brand-orange'}`}>
                    {openFaq === i ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-5 md:px-7 pb-6 text-brand-ink leading-relaxed text-base md:text-xl">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FINAL CTA — dark */}
      <section className="relative bg-brand-navyDark text-white py-20 md:py-28 clip-diagonal-top overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, rgba(224,87,38,0.4), transparent 60%)`
        }}></div>
        <div className="container mx-auto px-5 md:px-12 relative max-w-3xl text-center">
          <h2 className="font-display font-bold leading-[1.05] mb-6" style={{ fontSize: 'clamp(2.4rem, 5.5vw, 6rem)' }}>
            סוף החודש הבא<br />
            <span className="text-brand-orange">יכול להיראות אחרת.</span>
          </h2>
          <p className="text-xl md:text-3xl text-white/85 mb-8 leading-snug">
            28–31.6 · 20:00 בערב · בלייב · ללא עלות
          </p>

          <p className="font-display font-bold text-white text-2xl md:text-3xl mb-8">
            מחכות לראות אתכם שם,<br />
            <span className="text-brand-orange">אפרת וארזית.</span>
          </p>

          <div className="mt-4">
            <CTAPill label="שריינו את המקום שלכם בחינם" size="lg" href="#register" external={false} />
          </div>
        </div>
      </section>

      <footer className="bg-brand-navyDark text-white/50 py-8 text-center text-sm border-t border-white/10">
        <div className="container mx-auto px-5">
          <p className="mb-1 font-display font-bold text-base text-white/80">ביזנס אקספרס</p>
          <p className="mb-1">מיני קורס "עסק לכולם" · אפרת קולברג + ארזית נחום</p>
          <p className="mb-3">© עסק לכולם · כל הזכויות שמורות · פרטיותכם נשמרת</p>
          <p className="text-xs"><a href="/privacy.html" className="hover:text-white underline">מדיניות פרטיות</a> · <a href="/accessibility.html" className="hover:text-white underline">הצהרת נגישות</a></p>
        </div>
      </footer>

    </div>
  );
};

// Variants B and C now share the single, current 'עסק לכולם' page (AppA).
// The free-challenge rewrite consolidated all variants; ?v=b / ?v=c keep working.
const AppB = AppA;
const AppC = AppA;

// Router — picks A, B, or C based on `?v=` query param.
const App = () => {
  const [variant, setVariant] = useState<'a' | 'b' | 'c'>('a');
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('v');
    if (v === 'b') setVariant('b');
    else if (v === 'c') setVariant('c');
  }, []);
  if (variant === 'b') return <AppB />;
  if (variant === 'c') return <AppC />;
  return <AppA />;
};

export default App;
