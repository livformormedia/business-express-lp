import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2, XCircle, ChevronsLeft, Loader2, Plus, Minus,
  CalendarDays, Clock3, Video, Radio, Sparkles,
} from 'lucide-react';

/* ============================================================
   עסק לכולם — warm / bright / illustrated. Brand-only inheritance
   (Philosof/Almoni + brand colors). Popsy illustrations in orange.
   Copy = locked Section C (+ founder 4-6M line per Oriel 17/6).
   ============================================================ */

const WORKSHOP_DATE_ISO = '2026-06-28T20:00:00+03:00';
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/5glwvheb1iyca9vp947qvrva274g18vw';
const ILL = (n: string) => `/images/ill-${n}.svg`;

const useCountdown = (target: string) => {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => {
      const d = end - Date.now();
      if (d <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setT({ days: Math.floor(d / 86400000), hours: Math.floor((d % 86400000) / 3600000), minutes: Math.floor((d % 3600000) / 60000), seconds: Math.floor((d % 60000) / 1000) });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [target]);
  return t;
};

const collectTrackingData = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '', utm_campaign: p.get('utm_campaign') || '',
    utm_content: p.get('utm_content') || '', utm_term: p.get('utm_term') || '', gclid: p.get('gclid') || '', fbclid: p.get('fbclid') || '',
    referrer: document.referrer || '', landing_url: window.location.href, page_url: window.location.href, user_agent: navigator.userAgent,
    variant: p.get('v') || 'a', page_path: window.location.pathname, test_key: p.get('test_key') || '',
  };
};

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; y?: number; className?: string }> = ({ children, delay = 0, y = 26, className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div>
  );
};

const CTA: React.FC<{ label?: string; href?: string; className?: string }> = ({ label = 'שריינו את המקום שלכם בחינם', href = '#register-mid', className = '' }) => (
  <a href={href} className={`cta-pill group inline-flex items-center gap-3 bg-brand-orange text-white rounded-full font-display font-bold border-2 border-brand-orangeDark px-8 md:px-11 py-4 md:py-5 text-lg md:text-2xl ${className}`}>
    <ChevronsLeft size={28} strokeWidth={3} className="shrink-0 transition-transform group-hover:-translate-x-1" />{label}
  </a>
);

const Countdown: React.FC<{ tone?: 'light' | 'dark' }> = ({ tone = 'light' }) => {
  const { days, hours, minutes, seconds } = useCountdown(WORKSHOP_DATE_ISO);
  const cell = tone === 'light' ? 'bg-white border-brand-creamDark text-brand-navy shadow-sm' : 'bg-white/15 border-white/25 text-white';
  const lab = tone === 'light' ? 'text-brand-muted' : 'text-white/70';
  const Cell = ({ n, l }: { n: number; l: string }) => (
    <div className={`rounded-2xl border px-3.5 md:px-5 py-2.5 md:py-3 min-w-[58px] md:min-w-[74px] text-center ${cell}`}>
      <div className="font-display font-bold text-2xl md:text-4xl tabular-nums leading-none">{n.toString().padStart(2, '0')}</div>
      <div className={`text-[10px] md:text-xs mt-1 ${lab}`}>{l}</div>
    </div>
  );
  return (<div className="flex items-end gap-2 md:gap-2.5" dir="ltr"><Cell n={days} l="ימים" /><Cell n={hours} l="שעות" /><Cell n={minutes} l="דקות" /><Cell n={seconds} l="שניות" /></div>);
};

const TopBar = () => (
  <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-creamDark shadow-[0_2px_14px_rgba(26,26,46,0.06)]">
    <div className="container mx-auto px-4 md:px-12 py-3 md:py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <span className="font-display font-extrabold text-brand-navy text-lg md:text-2xl shrink-0">ביזנס אקספרס</span>
        <span className="hidden sm:inline-flex items-center gap-2 bg-brand-orangeSoft text-brand-orangeDark px-3.5 py-1.5 rounded-full font-display font-bold text-sm md:text-base whitespace-nowrap">
          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-60" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-orange" /></span>
          שידור חי · מתחיל 28.6 ב-20:00
        </span>
      </div>
      <a href="#register-top" className="cta-pill inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orangeDark text-white px-5 md:px-7 py-2.5 md:py-3 rounded-full font-display font-bold text-sm md:text-lg transition-colors shadow-md shrink-0 whitespace-nowrap">
        <ChevronsLeft size={18} strokeWidth={3} /> שריינו מקום בחינם
      </a>
    </div>
  </div>
);

const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-20 right-[-6%] w-[42%] h-[60%] rounded-full opacity-70 blur-[90px]" style={{ background: 'radial-gradient(circle, rgba(253,227,214,0.95), transparent 68%)' }} />
    <div className="absolute bottom-[-15%] left-[-8%] w-[38%] h-[55%] rounded-full opacity-50 blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(255,179,140,0.5), transparent 68%)' }} />
  </div>
);

// prominent form — orange header so it clearly reads as a registration form
const RegistrationForm: React.FC<{ id: string }> = ({ id }) => {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false); const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) { setError('כל השדות חובה'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('אימייל לא תקין'); return; }
    if (!/^[0-9\-+\s()]{7,}$/.test(phone)) { setError('טלפון לא תקין'); return; }
    if (!consent) { setError('יש לאשר קבלת הודעות בערוצי תקשורת'); return; }
    setSubmitting(true);
    const tracking = collectTrackingData();
    const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), challenge_date: '2026-06-28', challenge_time: '20:00', timestamp_iso: new Date().toISOString(), ...tracking };
    try {
      try { const fbq = (window as any).fbq; if (typeof fbq === 'function') fbq('track', 'Lead', { value: 0, currency: 'ILS', content_name: 'Esek LeKulam 4-Day Free Challenge' }, { eventID: eventId }); } catch { /* ignore */ }
      const leadBody = JSON.stringify({ event_type: 'lead', ...payload, fb_event_id: eventId, consent_marketing: consent, consent_at: new Date().toISOString() });
      fetch(MAKE_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: leadBody }).catch(() => {});
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: leadBody }).catch(() => {});
      setSubmitting(false); setDone(true);
    } catch (err: any) { setSubmitting(false); setError(err?.message ? `שגיאה: ${err.message}` : 'שגיאה לא צפויה. נסו שוב.'); }
  };
  return (
    <div id={id} className="scroll-mt-24 w-full max-w-md mx-auto rounded-[24px] overflow-hidden bg-white shadow-[0_26px_70px_rgba(26,26,46,0.22)] border-2 border-brand-orange/25">
      <div className="bg-brand-orange text-white text-center px-6 py-3.5 font-display font-bold text-base md:text-lg flex items-center justify-center gap-2">
        <Sparkles size={18} /> הרשמה חינם · שריינו מקום
      </div>
      <div className="p-6 md:p-7">
        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-orange flex items-center justify-center shadow-lg"><CheckCircle2 size={34} className="text-white" strokeWidth={2.5} /></div>
            <h3 className="font-display font-bold text-2xl mb-2 text-brand-navy">נרשמתם בהצלחה!</h3>
            <p className="text-brand-muted text-base leading-relaxed">שלחנו לכם את כל הפרטים והקישור לזום למייל. נתראה ב-28.6 בשעה 20:00.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-3.5">
            {[
              { l: 'שם מלא', v: name, set: setName, t: 'text', ac: 'name', ph: 'ישראל ישראלי', ltr: false },
              { l: 'אימייל', v: email, set: setEmail, t: 'email', ac: 'email', ph: 'name@example.com', ltr: true },
              { l: 'טלפון', v: phone, set: setPhone, t: 'tel', ac: 'tel', ph: '050-1234567', ltr: true },
            ].map((f) => (
              <div key={f.l}>
                <label className="block text-sm font-display font-bold mb-1.5 text-brand-navy">{f.l}</label>
                <input type={f.t} autoComplete={f.ac} inputMode={f.t === 'email' ? 'email' : f.t === 'tel' ? 'tel' : undefined as any} dir={f.ltr ? 'ltr' : undefined} value={f.v} onChange={(e) => f.set(e.target.value)} disabled={submitting} placeholder={f.ph}
                  className={`w-full px-4 py-3 text-base rounded-xl border-2 border-brand-creamDark bg-brand-cream/50 focus:bg-white focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60 ${f.ltr ? 'text-right' : ''}`} />
              </div>
            ))}
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-0.5">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={submitting} className="mt-1 w-5 h-5 accent-brand-orange shrink-0 cursor-pointer" />
              <span className="text-xs text-brand-navy/75 leading-snug">אני מאשר/ת קבלת תכנים שיווקיים ועדכונים מ"עסק לכולם" בכל ערוצי התקשורת (אימייל, SMS, WhatsApp ושיחה), בהתאם ל<a href="/privacy.html" target="_blank" rel="noopener" className="underline text-brand-orange font-bold">מדיניות הפרטיות</a>. ניתן להסיר רישום בכל עת.</span>
            </label>
            {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm font-display font-bold text-center">{error}</div>}
            <button type="submit" disabled={submitting} className="cta-pill w-full flex items-center justify-center gap-3 bg-brand-orange text-white rounded-full font-display font-bold border-2 border-brand-orangeDark px-7 py-4 text-lg disabled:opacity-70 disabled:cursor-wait">
              {submitting ? <><Loader2 size={22} className="animate-spin" /> רושמים אתכם...</> : <><ChevronsLeft size={26} strokeWidth={3} /> אני רוצה להצטרף</>}
            </button>
            <p className="text-center text-brand-muted text-xs">ללא עלות · אישור והקישור לזום נשלחים מיד למייל</p>
          </form>
        )}
      </div>
    </div>
  );
};

// constant across ALL variants — the 4-day-free-mini-course subheadline + the "hour a day" promise (Oriel 17/6)
const HERO_SUBHEAD = 'מיני קורס חינמי בן 4 ימים בלייב, שמלמד אתכם איך להפוך את הניסיון והידע שכבר יש לכם להכנסה נוספת.';
const HERO_PROMISE = (<>כל מה שצריך זה <span className="text-brand-orange">שעה ביום</span>. בלי לסכן שקל, בלי ללמוד מקצוע חדש ובלי להתפטר.</>);

// 4 headline/hook variants — switch per ad via ?v=a|b|c|d (variant captured in webhook payload)
const HERO_VARIANTS: Record<string, { kicker: string; headline: React.ReactNode; hook?: string }> = {
  a: {
    kicker: 'מיני קורס לייב לשכירים ומשפחות · ללא עלות',
    headline: <>איך להגדיל הכנסה למשפחה <span className="text-brand-orange">בלי לסכן שקל</span>, בלי ללמוד מקצוע חדש או להתפטר מהעבודה</>,
    hook: 'מיני קורס ללא עלות בן 4 ימים בלייב, לשכירים ומשפחות שמבינות שלייצר הכנסה נוספת זו לא המלצה אלא חובה ב-2026.',
  },
  b: {
    kicker: 'מיני קורס לייב · 4 ימים · ללא עלות',
    headline: <>איך לפתוח עסק מהצד ולהכניס <span className="text-brand-orange">בין 5 ל-8 אלף ש"ח נוספים</span> בכל חודש</>,
    hook: 'ואיך באמת לעשות כסף מהידע והנסיון שצברת כל השנים.',
  },
  c: {
    kicker: 'משכורת נוספת · בשעה ביום',
    headline: <>איך להכניס <span className="text-brand-orange">5,000–8,000 ש"ח נוספים</span> מהידע, הכישורים והכישרון שכבר יש לך</>,
    hook: 'בלי רעיון גאוני, בלי לקחת סיכונים ובלי להתפטר (עדיין…)',
  },
  d: {
    kicker: 'משכורת אקסטרה · בשעה ביום',
    headline: <>איך להכניס <span className="text-brand-orange">5,000–8,000 ש"ח נוספים</span> מהידע, הכישורים והכישרון שכבר יש לך</>,
    hook: 'בלי רעיון גאוני, בלי לקחת סיכונים ובלי להתפטר (עדיין…)',
  },
};

const Hero = () => {
  const reduce = useReducedMotion();
  const _p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const V = HERO_VARIANTS[_p.get('v') || 'a'] || HERO_VARIANTS.a;
  return (
    <section className="relative overflow-hidden bg-white">
      <Blobs />
      <div className="container mx-auto px-5 md:px-12 relative pt-7 md:pt-12 pb-12 md:pb-16 max-w-6xl">
        {/* header: copy + illustration */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-right order-2 lg:order-1">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-orangeSoft text-brand-orangeDark px-4 py-1.5 text-sm md:text-base font-display font-bold mb-5">
                <Sparkles size={16} /> {V.kicker}
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display font-bold text-brand-navy leading-[1.05] mb-4" style={{ fontSize: 'clamp(2.3rem, 5vw, 4.1rem)', textWrap: 'balance' as any }}>
                {V.headline}
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-brand-ink leading-relaxed max-w-xl mx-auto lg:mx-0 mb-4" style={{ fontSize: 'clamp(1.1rem, 1.9vw, 1.4rem)' }}>
                {HERO_SUBHEAD}
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="font-display font-bold text-brand-navy leading-snug max-w-xl mx-auto lg:mx-0" style={{ fontSize: 'clamp(1.3rem, 2.3vw, 1.8rem)' }}>
                {HERO_PROMISE}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 mt-6 text-brand-navy font-display font-bold text-base md:text-lg">
                <span className="inline-flex items-center gap-2"><CalendarDays size={20} className="text-brand-orange" /> 28–31.6</span><span className="text-brand-creamDark">·</span>
                <span className="inline-flex items-center gap-2"><Clock3 size={20} className="text-brand-orange" /> 20:00 בערב</span><span className="text-brand-creamDark">·</span>
                <span className="inline-flex items-center gap-2"><Video size={20} className="text-brand-orange" /> בלייב בזום</span>
              </div>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-7 flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-4 justify-center lg:justify-start">
                <CTA href="#register-top" label="שריינו מקום בחינם" />
                <span className="text-brand-muted text-sm md:text-base font-display font-bold leading-snug max-w-[190px] sm:max-w-none text-center sm:text-right">ללא עלות · מקומות מוגבלים · שידור חי בלבד</span>
              </div>
            </Reveal>
          </div>
          <div className="order-1 lg:order-2 relative">
            <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[72%] aspect-square rounded-full" style={{ background: 'radial-gradient(circle, rgba(253,227,214,0.9), transparent 70%)' }} />
            </div>
            <Reveal y={0}>
              <motion.img src={ILL('work-from-home')} alt="שכיר שמגלה שהידע שלו שווה כסף, מהבית" className="relative w-[74%] sm:w-[56%] lg:w-full max-w-md mx-auto block select-none"
                initial={reduce ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} draggable={false} />
            </Reveal>
            <Reveal delay={0.2}>
              <div className="relative mx-auto max-w-[300px] lg:max-w-sm -mt-1 lg:mt-3 rounded-2xl bg-white border border-brand-creamDark shadow-[0_18px_50px_rgba(26,26,46,0.16)] p-4 flex flex-col items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-brand-orangeDark font-display font-bold text-sm md:text-base"><Radio size={16} /> השידור החי מתחיל בעוד</span>
                <Countdown tone="light" />
              </div>
            </Reveal>
          </div>
        </div>

        {/* value bullets — above the CTA */}
        <Reveal delay={0.05}>
          <ul className="mt-12 md:mt-14 grid sm:grid-cols-3 gap-5 md:gap-6">
            {['תגלו איך לייצר הכנסה נוספת מהניסיון והידע שכבר קיים אצלכם, בלי ללמוד מקצוע חדש.', 'תגלו איך לעשות את זה בלי לסכן שקל אחד.', 'ללא עלות, ללא הגבלת מקומות, סה״כ 30 דקות הדרכה ביום, למשך 4 ימים.'].map((t, i) => (
              <li key={i} className="flex items-start gap-3.5 rounded-2xl bg-brand-orangeSoft/40 border border-brand-orange/15 p-5 md:p-6">
                <CheckCircle2 size={28} className="text-brand-orange shrink-0 mt-0.5" strokeWidth={2.5} />
                <span className="text-brand-navy font-display font-bold leading-snug" style={{ fontSize: 'clamp(1.05rem, 1.7vw, 1.3rem)' }}>{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* scarcity ribbon */}
        <Reveal delay={0.05}>
          <div className="mt-10 md:mt-12 rounded-2xl bg-brand-navy text-white px-5 py-4 md:py-5 text-center font-display font-bold leading-snug" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.5rem)' }}>
            שידור חי בלבד · אין הקלטה · מי שלא מגיע, מפספס.
          </div>
        </Reveal>

        {/* benefit-driven line + the form */}
        <Reveal delay={0.05}>
          <div className="mt-9 md:mt-11 rounded-[32px] bg-brand-orangeSoft/55 p-6 md:p-9 text-center">
            <p className="font-display font-bold text-brand-navy leading-snug mb-6 max-w-2xl mx-auto" style={{ fontSize: 'clamp(1.3rem, 2.6vw, 2rem)' }}>
              שריינו מקום ל-4 הערבים שיראו לכם איך להפוך את מה שאתם כבר יודעים <span className="text-brand-orange">ל-5,000–8,000 ש"ח בחודש.</span>
            </p>
            <RegistrationForm id="register-top" />
            <p className="text-brand-muted text-sm mt-4">בהנחיית אפרת קולברג וארזית נחום</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const DAYS = [
  { n: '1', t: 'זיהוי הכסף שמסתתר אצלך', d: 'איך לזהות תוך 60 דקות איזה ידע שלך יכול להפוך להכנסה נוספת.' },
  { n: '2', t: 'יותר כסף, פחות שעות', d: 'איך להפוך את הידע שלך למוצר שמוכנים לשלם לך עליו פי 5 ממה שהבוס שלך משלם לך.' },
  { n: '3', t: 'הלקוחות הראשונים', d: 'איך להביא את הלקוח הראשון בלי אתר ובלי לשים שקל אחד על מודעות.' },
  { n: '4', t: 'מודל 8 הצעדים', d: 'להכנסה נוספת יציבה של 5,000–8,000 ש"ח בחודש, צעד אחר צעד.' },
];
const DaysList = () => (
  <section className="bg-white py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-6xl">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-center">
        <Reveal y={0} className="order-2 lg:order-1">
          <img src={ILL('freelancer')} alt="להפוך את הידע שכבר יש לכם להכנסה נוספת" className="w-[62%] lg:w-full max-w-sm mx-auto block" draggable={false} />
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <h2 className="font-display font-bold text-brand-navy leading-[1.05] mb-8 md:mb-10 text-center lg:text-right" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}>
              מה נלמד ב-<span className="text-brand-orange">4 הימים?</span>
            </h2>
          </Reveal>
          <div className="space-y-3.5">
            {DAYS.map((day, i) => (
              <Reveal key={day.n} delay={i * 0.06}>
                <div className="flex items-start gap-4 md:gap-5 rounded-2xl p-4 md:p-5 bg-brand-cream/70 hover:bg-brand-cream transition-colors">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-brand-orange text-white flex items-center justify-center font-display font-bold text-xl md:text-2xl shadow-[0_6px_18px_rgba(224,87,38,0.3)]">{day.n}</div>
                  <div className="pt-0.5">
                    <h3 className="font-display font-bold text-brand-navy text-lg md:text-2xl mb-1 leading-snug">{day.t}</h3>
                    <p className="text-brand-muted text-sm md:text-lg leading-relaxed">{day.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}><div className="text-center lg:text-right mt-9"><CTA href="#register-mid" /></div></Reveal>
        </div>
      </div>
    </div>
  </section>
);

const FormSection: React.FC<{ id: string }> = ({ id }) => (
  <section className="bg-brand-cream py-16 md:py-20">
    <div className="container mx-auto px-5 md:px-12">
      <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center max-w-4xl mx-auto">
        <Reveal y={0} className="text-center">
          <img src={ILL('video-call')} alt="המפגשים בלייב דרך זום, מהסלון בבית" className="w-[64%] md:w-full max-w-xs mx-auto block" draggable={false} />
          <p className="font-display font-bold text-brand-navy text-xl md:text-2xl mt-5 leading-snug">4 ערבים בלייב מהבית.<br /><span className="text-brand-orange">שריינו מקום עכשיו.</span></p>
        </Reveal>
        <Reveal><RegistrationForm id={id} /></Reveal>
      </div>
    </div>
  </section>
);

const RiskReversal = () => (
  <section className="bg-white py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-5xl">
      <Reveal><h2 className="font-display font-bold text-brand-navy text-center leading-[1.05] mb-10 md:mb-12" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}>מה יש לכם להפסיד?</h2></Reveal>
      <div className="grid md:grid-cols-2 gap-5 md:gap-7 items-stretch">
        <Reveal>
          <div className="h-full rounded-3xl bg-brand-cream p-7 md:p-9 border border-brand-creamDark">
            <div className="font-display font-bold text-brand-muted text-lg mb-2">במקרה הכי גרוע?</div>
            <p className="text-brand-navy text-lg md:text-2xl leading-relaxed font-display font-bold">תגיעו לשידור הראשון, תחשבו שזה חרטה ברטה, ותמשיכו בחייכם.</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl bg-brand-orange text-white p-7 md:p-9 shadow-[0_18px_45px_rgba(224,87,38,0.3)] relative overflow-hidden">
            <img src={ILL('success')} alt="" aria-hidden className="absolute -left-3 -bottom-3 w-28 md:w-36 opacity-90" draggable={false} />
            <div className="relative">
              <div className="font-display font-bold text-white/85 text-lg mb-2">במקרה הכי טוב?</div>
              <p className="text-white text-lg md:text-2xl leading-relaxed font-display font-bold">תבינו איך להשתמש בכישורים והניסיון שכבר יש לכם בכדי לייצר הכנסה של 5,000–8,000 ש"ח שתשמש לכם ולמשפחה שלכם ככרית ביטחון כלכלית בתוך 60 יום.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const WhoFor = () => (
  <section className="bg-brand-cream py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-5xl">
      <Reveal><h2 className="font-display font-bold text-brand-navy text-center leading-[1.05] mb-12" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}>זה <span className="text-brand-orange">בשבילכם?</span></h2></Reveal>
      <div className="grid md:grid-cols-2 gap-5 md:gap-7">
        <Reveal>
          <div className="h-full rounded-3xl bg-white p-7 md:p-9 border-2 border-brand-orange/30 shadow-sm">
            <h3 className="flex items-center gap-3 font-display font-bold text-brand-navy text-2xl mb-5"><span className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center shrink-0"><CheckCircle2 size={22} className="text-white" strokeWidth={2.6} /></span> בשבילכם אם</h3>
            <ul className="space-y-3.5 text-brand-ink text-lg">{['אתם שכירים עם 10+ שנות ניסיון.', 'שתי משכורות נכנסות ועדיין צפוף בסוף החודש.', 'רוצים הכנסה נוספת אבל לא יודעים מאיפה להתחיל.'].map((x, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle2 size={20} className="text-brand-orange shrink-0 mt-1" /> {x}</li>))}</ul>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl bg-white p-7 md:p-9 border border-brand-creamDark">
            <h3 className="flex items-center gap-3 font-display font-bold text-brand-navy/70 text-2xl mb-5"><span className="w-10 h-10 rounded-full bg-brand-creamDark flex items-center justify-center shrink-0"><XCircle size={22} className="text-brand-muted" strokeWidth={2.6} /></span> לא בשבילכם אם</h3>
            <ul className="space-y-3.5 text-brand-muted text-lg">{['אתם מחפשים כפתור קסם או להתעשר מהר.', 'לא מוכנים להשקיע אפילו שעה ביום.'].map((x, i) => (<li key={i} className="flex items-start gap-3"><XCircle size={20} className="text-brand-muted/60 shrink-0 mt-1" /> {x}</li>))}</ul>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const Tax = () => (
  <section className="bg-white py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-3xl">
      <Reveal>
        <div className="rounded-[28px] bg-brand-cream p-8 md:p-12 border border-brand-creamDark">
          <h2 className="font-display font-bold text-brand-navy leading-[1.15] mb-6 text-center" style={{ fontSize: 'clamp(1.55rem, 3.2vw, 2.5rem)' }}>"אבל אני אצטרך לפתוח עסק ולשלם מיסים?"</h2>
          <div className="text-brand-ink text-lg md:text-xl leading-relaxed space-y-4">
            <p>שאלה טובה, וזה בדיוק הפחד שעוצר את רוב האנשים.</p>
            <p>אז בואו נרגיע אתכם: כן, בשלב מסוים פותחים עוסק פטור, וזה הרבה יותר פשוט וזול ממה שאתם מדמיינים, צעד אחר צעד, ואנחנו נלווה אתכם לאורך כל הדרך.</p>
            <p>אבל זה ממש לא הדבר הראשון. <span className="text-brand-navy font-display font-bold">החלק המפחיד באמת הוא לא המיסים, הוא פשוט להבין קודם כל אם יש לכם בכלל משהו ששווה כסף. <span className="text-brand-orange">בדיוק את זה נעשה ביום הראשון.</span></span></p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

// founders — premium: large photos + highlighted journey stat + 4-6M line
const Founders = () => (
  <section className="bg-brand-navy text-white py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-5xl">
      <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            {[{ src: '/images/efrat.jpg', n: 'אפרת קולברג' }, { src: '/images/arzit.jpg', n: 'ארזית נחום' }].map((f, i) => (
              <div key={f.n} className={i === 0 ? 'pt-6' : ''}>
                <div className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl aspect-[3/4] bg-white/5"><img src={f.src} alt={f.n} className="w-full h-full object-cover" loading="lazy" /></div>
                <p className="font-display font-bold text-center mt-3 md:text-lg">{f.n}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div>
            <p className="text-brand-orangeLight font-display font-bold mb-2">מי אנחנו?</p>
            <h2 className="font-display font-bold leading-[1.05] mb-5" style={{ fontSize: 'clamp(1.9rem, 4vw, 3.2rem)' }}>גם אנחנו <span className="text-brand-orange">היינו שכירות.</span></h2>
            <div className="text-white/75 text-lg leading-relaxed space-y-4">
              <p>אנחנו אפרת קולברג וארזית נחום, ושתינו היינו שכירות. ארזית ניהלה את השיווק בחברת DHL תמורת <strong className="text-white">12,000 ש"ח בחודש</strong>, עד שפיטרו אותה, ואותו ידע בדיוק התחיל להכניס לה <strong className="text-white">950 ש"ח על שעת ייעוץ אחת</strong>. והיום יש לנו עסק שמכניס <strong className="text-brand-orange">4-6 מיליון ש"ח בשנה</strong> (לא פתחנו סטארט אפ, זה מאותו תחום בדיוק של ייעוץ עסקי).</p>
              <p>בשנה האחרונה ליווינו מאות אנשים. עכשיו אנחנו לוקחות את כל מה שלמדנו, ומלמדות אתכם איך לעשות בדיוק את אותו הדבר, צעד אחר צעד.</p>
            </div>
            {/* journey stat strip */}
            <div className="mt-7 flex items-stretch gap-2 md:gap-3" dir="rtl">
              {[{ k: 'כשכירה', v: '12,000', s: 'לחודש' }, { k: 'כיועצת', v: '950', s: 'לשעה' }, { k: 'היום', v: '4-6 מ׳', s: 'בשנה', hot: true }].map((st, i) => (
                <React.Fragment key={i}>
                  <div className={`flex-1 rounded-2xl px-3 py-3 text-center ${st.hot ? 'bg-brand-orange' : 'bg-white/10'}`}>
                    <div className={`text-[11px] font-display font-bold ${st.hot ? 'text-white/85' : 'text-white/55'}`}>{st.k}</div>
                    <div className="font-display font-bold text-xl md:text-2xl leading-tight">{st.v}</div>
                    <div className={`text-[11px] ${st.hot ? 'text-white/85' : 'text-white/55'}`}>ש"ח {st.s}</div>
                  </div>
                  {i < 2 && <div className="flex items-center text-brand-orange"><ChevronsLeft size={20} strokeWidth={3} /></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const FAQS = [
  { q: 'מתי?', a: '28–31 ביוני, כל ערב ב-20:00.' }, { q: 'כמה זמן?', a: '30 דקות ביום, 4 ימים.' },
  { q: 'איפה?', a: 'בלייב מהבית, דרך זום.' }, { q: 'כמה זה עולה?', a: 'ללא עלות, וללא הגבלת מקומות.' },
  { q: 'תהיה הקלטה?', a: 'השידור בלייב בלבד. מי שלא מגיע, מפספס.' },
];
const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-5 md:px-12 max-w-3xl">
        <Reveal><h2 className="font-display font-bold text-brand-navy text-center leading-[1.05] mb-10" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}>איך זה <span className="text-brand-orange">עובד?</span></h2></Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="rounded-2xl bg-brand-cream/60 border border-brand-creamDark overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-5 md:px-7 py-5 flex items-center justify-between gap-4 text-right">
                  <span className={`font-display font-bold text-lg md:text-xl ${open === i ? 'text-brand-orange' : 'text-brand-navy'}`}>{f.q}</span>
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${open === i ? 'bg-brand-orange text-white' : 'bg-white text-brand-orange border border-brand-orange/40'}`}>{open === i ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}</span>
                </button>
                <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><p className="px-5 md:px-7 pb-5 text-brand-ink text-base md:text-lg leading-relaxed">{f.a}</p></div></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => (
  <section className="relative bg-brand-orange text-white py-16 md:py-24 overflow-hidden">
    <div aria-hidden className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #fff, transparent 55%)' }} />
    <div className="container mx-auto px-5 md:px-12 max-w-5xl relative">
      <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <Reveal y={0} className="text-center md:text-right">
          <div className="inline-block bg-white rounded-[28px] p-3 md:p-4 shadow-xl mb-5"><img src={ILL('man-riding-a-rocket')} alt="" aria-hidden className="w-[170px] md:w-[220px] block" draggable={false} /></div>
          <h2 className="font-display font-bold leading-[1.05] mb-3" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.4rem)' }}>זה הזמן להפוך את הידע שלכם להכנסה נוספת.</h2>
          <p className="text-white/90 font-display font-bold text-lg md:text-xl mb-5">28–31.6 · 20:00 בערב · בלייב · ללא עלות</p>
          <div className="flex justify-center md:justify-start"><Countdown tone="dark" /></div>
          <p className="font-display font-bold text-white text-lg md:text-xl mt-6">מחכות לראות אתכם שם, אפרת וארזית.</p>
        </Reveal>
        <Reveal delay={0.08}><RegistrationForm id="register-bottom" /></Reveal>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-white text-brand-muted py-9 text-center text-sm border-t border-brand-creamDark">
    <div className="container mx-auto px-5 space-y-1.5">
      <p className="font-display font-bold text-brand-navy text-base">ביזנס אקספרס</p>
      <p>המיני קורס "עסק לכולם" · אפרת קולברג + ארזית נחום</p>
      <p>© עסק לכולם · כל הזכויות שמורות · פרטיותכם נשמרת</p>
      <p className="text-xs pt-1"><a href="/privacy.html" className="hover:text-brand-navy underline">מדיניות פרטיות</a> · <a href="/accessibility.html" className="hover:text-brand-navy underline">הצהרת נגישות</a></p>
    </div>
  </footer>
);

const AppA = () => (
  <div className="bg-white min-h-screen overflow-x-clip" dir="rtl">
    <TopBar /><Hero /><DaysList /><FormSection id="register-mid" /><RiskReversal /><WhoFor /><Tax /><Founders /><FAQ /><FinalCTA /><Footer />
  </div>
);
const App = () => <AppA />;
export default App;
