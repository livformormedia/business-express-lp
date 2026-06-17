import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2, XCircle, ChevronsLeft, Loader2, Plus, Minus,
  Calendar, Clock, Video, BadgeCheck, Wallet, ArrowLeft,
} from 'lucide-react';

/* ============================================================
   עסק לכולם — drenched dark + orange redesign.
   Brand-only inheritance: Philosof/Almoni fonts + brand colors.
   Copy = locked Section C. Free lead-gen, no payment.
   ============================================================ */

const WORKSHOP_DATE_ISO = '2026-06-28T20:00:00+03:00';
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/5glwvheb1iyca9vp947qvrva274g18vw';

// ---- countdown ----
const useCountdown = (target: string) => {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setT({
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
  return t;
};

// ---- tracking (UTMs + click-ids + meta) ----
const collectTrackingData = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '',
    utm_campaign: p.get('utm_campaign') || '', utm_content: p.get('utm_content') || '',
    utm_term: p.get('utm_term') || '', gclid: p.get('gclid') || '', fbclid: p.get('fbclid') || '',
    referrer: document.referrer || '', landing_url: window.location.href, page_url: window.location.href,
    user_agent: navigator.userAgent, variant: p.get('v') || 'a', page_path: window.location.pathname,
    test_key: p.get('test_key') || '',
  };
};

// ---- motion reveal ----
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; y?: number; className?: string }> = ({ children, delay = 0, y = 28, className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

// ---- primary CTA ----
const CTA: React.FC<{ label?: string; sub?: string; className?: string }> = ({ label = 'שריינו את המקום שלכם בחינם', sub, className = '' }) => (
  <a href="#register-top"
     className={`group inline-flex flex-col items-center gap-1.5 ${className}`}>
    <span className="cta-pill inline-flex items-center gap-3 bg-brand-orange text-white rounded-full font-display font-bold border-2 border-brand-orangeDark px-9 md:px-12 py-4 md:py-5 text-lg md:text-2xl">
      <ChevronsLeft size={28} strokeWidth={3} className="shrink-0 transition-transform group-hover:-translate-x-1" />
      {label}
    </span>
    {sub && <span className="text-white/55 text-sm md:text-base">{sub}</span>}
  </a>
);

// ---- sticky countdown bar ----
const CountdownBar = () => {
  const { days, hours, minutes, seconds } = useCountdown(WORKSHOP_DATE_ISO);
  const Cell = ({ n, l }: { n: number; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="font-display font-bold text-xl md:text-2xl text-white tabular-nums leading-none">{n.toString().padStart(2, '0')}</span>
      <span className="text-[10px] md:text-xs text-white/45 mt-0.5">{l}</span>
    </div>
  );
  return (
    <div className="sticky top-0 z-40 bg-brand-navyDark/90 backdrop-blur border-b border-brand-orange/30">
      <div className="container mx-auto px-4 md:px-12 py-2.5 flex items-center justify-center gap-4 md:gap-6">
        <span className="text-white/70 font-display font-bold text-sm md:text-base whitespace-nowrap">האתגר מתחיל בעוד</span>
        <div className="flex items-center gap-3 md:gap-5" dir="ltr">
          <Cell n={days} l="ימים" /><span className="text-brand-orange font-bold">:</span>
          <Cell n={hours} l="שעות" /><span className="text-brand-orange font-bold">:</span>
          <Cell n={minutes} l="דקות" /><span className="text-brand-orange font-bold">:</span>
          <Cell n={seconds} l="שניות" />
        </div>
      </div>
    </div>
  );
};

// ---- registration form (cream card; keeps webhook/UTM/pixel) ----
const RegistrationForm: React.FC<{ id: string; tone?: 'onDark' | 'onOrange' }> = ({ id, tone = 'onDark' }) => {
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
    const payload = {
      name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(),
      challenge_date: '2026-06-28', challenge_time: '20:00', timestamp_iso: new Date().toISOString(), ...tracking,
    };
    try {
      try {
        const fbq = (window as any).fbq;
        if (typeof fbq === 'function') fbq('track', 'Lead', { value: 0, currency: 'ILS', content_name: 'Esek LeKulam 4-Day Free Challenge' }, { eventID: eventId });
      } catch { /* ignore */ }
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'lead', ...payload, fb_event_id: eventId, consent_marketing: consent, consent_at: new Date().toISOString() }),
      }).catch(() => { /* swallow */ });
      setSubmitting(false); setDone(true);
    } catch (err: any) {
      setSubmitting(false); setError(err?.message ? `שגיאה: ${err.message}` : 'שגיאה לא צפויה. נסו שוב.');
    }
  };

  return (
    <div id={id} className="scroll-mt-24">
      <div className="bg-brand-cream text-brand-navy rounded-[28px] p-6 md:p-9 shadow-2xl border border-black/5 max-w-xl mx-auto">
        {done ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-orange flex items-center justify-center shadow-lg">
              <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-bold text-2xl md:text-3xl mb-2">נרשמתם בהצלחה!</h3>
            <p className="text-brand-muted text-base md:text-lg leading-relaxed">שלחנו לכם את כל הפרטים והקישור לזום למייל. נתראה ב-28.6 בשעה 20:00.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-3.5">
            <div className="text-center mb-1">
              <h3 className="font-display font-bold text-2xl md:text-3xl leading-tight">מוכנים להתחיל?</h3>
              <p className="text-brand-muted text-sm md:text-base mt-1">השאירו פרטים ושריינו מקום במיני קורס "עסק לכולם", בחינם.</p>
            </div>
            <div>
              <label className="block text-sm font-display font-bold mb-1.5">שם מלא</label>
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting}
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-brand-creamDark bg-white focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60" placeholder="ישראל ישראלי" />
            </div>
            <div>
              <label className="block text-sm font-display font-bold mb-1.5">אימייל</label>
              <input type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting}
                className="w-full px-4 py-3 text-base text-right rounded-xl border-2 border-brand-creamDark bg-white focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60" placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-display font-bold mb-1.5">טלפון</label>
              <input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting}
                className="w-full px-4 py-3 text-base text-right rounded-xl border-2 border-brand-creamDark bg-white focus:border-brand-orange focus:outline-none transition-colors disabled:opacity-60" placeholder="050-1234567" />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-0.5">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={submitting}
                className="mt-1 w-5 h-5 accent-brand-orange shrink-0 cursor-pointer" />
              <span className="text-xs text-brand-navy/75 leading-snug">
                אני מאשר/ת קבלת תכנים שיווקיים ועדכונים מ"עסק לכולם" בכל ערוצי התקשורת (אימייל, SMS, WhatsApp ושיחה), בהתאם ל<a href="/privacy.html" target="_blank" rel="noopener" className="underline text-brand-orange font-bold">מדיניות הפרטיות</a>. ניתן להסיר רישום בכל עת.
              </span>
            </label>
            {error && <div className="bg-red-50 border-2 border-red-300 text-red-800 rounded-xl px-4 py-2.5 text-sm font-display font-bold text-center">{error}</div>}
            <button type="submit" disabled={submitting}
              className="cta-pill w-full flex items-center justify-center gap-3 bg-brand-orange text-white rounded-full font-display font-bold border-2 border-brand-orangeDark px-7 py-4 text-lg md:text-xl disabled:opacity-70 disabled:cursor-wait">
              {submitting ? <><Loader2 size={22} className="animate-spin" /> רושמים אתכם...</> : <><ChevronsLeft size={26} strokeWidth={3} /> אני רוצה להצטרף</>}
            </button>
            <p className="text-center text-brand-muted text-xs">ללא עלות · אישור והקישור לזום נשלחים מיד למייל</p>
          </form>
        )}
      </div>
    </div>
  );
};

// ---- hero ----
const Hero = () => {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-brand-navyDark">
      {/* orange ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 right-[-10%] w-[70%] h-[80%] rounded-full opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(224,87,38,0.55), transparent 65%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[55%] h-[60%] rounded-full opacity-25 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255,115,64,0.5), transparent 65%)' }} />
      </div>

      <div className="container mx-auto px-5 md:px-12 relative pt-10 md:pt-16 pb-12 md:pb-20 max-w-6xl">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-white/80 text-sm md:text-base font-display font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            מיני קורס לייב לשכירים ומשפחות · ללא עלות
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="font-display font-bold text-white leading-[1.04] mb-5" style={{ fontSize: 'clamp(2.2rem, 5.2vw, 4.4rem)', textWrap: 'balance' as any }}>
            איך להגדיל הכנסה למשפחה <span className="text-brand-orange">בלי לסכן שקל</span>, ללמוד מקצוע חדש או להתפטר מהעבודה
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-white/70 leading-relaxed mb-7 max-w-2xl" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.5rem)' }}>
            מיני קורס ללא עלות בן 4 ימים בלייב, לשכירים ומשפחות שמבינות שלייצר הכנסה נוספת זו לא המלצה אלא חובה ב-2026.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 text-white/85 font-display font-bold text-base md:text-xl">
            <span className="inline-flex items-center gap-2"><Calendar size={20} className="text-brand-orange" /> 28–31.6</span>
            <span className="text-white/25">·</span>
            <span className="inline-flex items-center gap-2"><Clock size={20} className="text-brand-orange" /> 20:00 בערב</span>
            <span className="text-white/25">·</span>
            <span className="inline-flex items-center gap-2"><Video size={20} className="text-brand-orange" /> בלייב בזום</span>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CTA />
            <span className="text-white/55 text-sm md:text-base">בהנחיית אפרת קולברג וארזית נחום</span>
          </div>
        </Reveal>

        {/* hero bullets as a clean row, not cards */}
        <Reveal delay={0.28}>
          <ul className="mt-11 grid sm:grid-cols-3 gap-x-8 gap-y-4 max-w-4xl border-t border-white/10 pt-7">
            {[
              'תגלו איך לייצר הכנסה נוספת מהניסיון והידע שכבר קיים אצלכם, בלי ללמוד מקצוע חדש.',
              'תגלו איך לעשות את זה בלי לסכן שקל אחד.',
              'ללא עלות, ללא הגבלת מקומות, סה״כ 30 דקות הדרכה ביום, למשך 4 ימים.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-white/75 leading-snug text-sm md:text-base">
                <CheckCircle2 size={20} className="text-brand-orange shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};

// ---- promise band (big editorial moment) ----
const PromiseBand = () => (
  <section className="bg-brand-navy py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-4xl text-center">
      <Reveal>
        <p className="font-display font-bold text-white leading-[1.15]" style={{ fontSize: 'clamp(1.7rem, 4vw, 3.2rem)', textWrap: 'balance' as any }}>
          מה שאתם כבר יודעים לעשות <span className="text-brand-orange">שווה כסף.</span> הרבה יותר ממה שהבוס משלם לכם עליו. ב-4 ערבים נראה לכם איך להפוך את זה ל-5,000–8,000 ש"ח בחודש.
        </p>
      </Reveal>
    </div>
  </section>
);

// ---- 4 days (numbered timeline, not card grid) ----
const DAYS = [
  { n: '1', t: 'זיהוי הכסף שמסתתר אצלך', d: 'איך לזהות תוך 60 דקות איזה ידע שלך יכול להפוך להכנסה נוספת.' },
  { n: '2', t: 'יותר כסף, פחות שעות', d: 'איך להפוך את הידע שלך למוצר שמוכנים לשלם לך עליו פי 5 ממה שהבוס שלך משלם לך.' },
  { n: '3', t: 'הלקוחות הראשונים', d: 'איך להביא את הלקוח הראשון בלי אתר ובלי לשים שקל אחד על מודעות.' },
  { n: '4', t: 'מודל 8 הצעדים', d: 'להכנסה נוספת יציבה של 5,000–8,000 ש"ח בחודש, צעד אחר צעד.' },
];
const DaysTimeline = () => (
  <section id="days" className="bg-brand-navyDark py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-4xl">
      <Reveal>
        <h2 className="font-display font-bold text-white text-center leading-[1.05] mb-12 md:mb-16" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.6rem)' }}>
          מה נלמד ב-<span className="text-brand-orange">4 הימים?</span>
        </h2>
      </Reveal>
      <div className="relative">
        <div aria-hidden className="absolute top-2 bottom-2 right-7 md:right-8 w-px bg-gradient-to-b from-brand-orange/60 via-brand-orange/25 to-transparent" />
        <div className="space-y-7 md:space-y-9">
          {DAYS.map((day, i) => (
            <Reveal key={day.n} delay={i * 0.07}>
              <div className="flex items-start gap-5 md:gap-7">
                <div className="relative z-10 shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-brand-orange text-white flex items-center justify-center font-display font-bold text-2xl md:text-3xl shadow-[0_8px_24px_rgba(224,87,38,0.4)]">
                  {day.n}
                </div>
                <div className="pt-1.5">
                  <div className="text-brand-orangeLight font-display font-bold text-sm md:text-base mb-1">יום {day.n}</div>
                  <h3 className="font-display font-bold text-white text-xl md:text-3xl mb-1.5 leading-snug">{day.t}</h3>
                  <p className="text-white/65 text-base md:text-lg leading-relaxed max-w-2xl">{day.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Reveal delay={0.1}>
        <div className="text-center mt-14"><CTA /></div>
      </Reveal>
    </div>
  </section>
);

// ---- inline form section on dark ----
const FormSection: React.FC<{ id: string }> = ({ id }) => (
  <section className="bg-brand-navy py-14 md:py-20">
    <div className="container mx-auto px-5 md:px-12">
      <Reveal><RegistrationForm id={id} /></Reveal>
    </div>
  </section>
);

// ---- risk reversal (orange drench band) ----
const RiskBand = () => (
  <section className="relative bg-brand-orange text-white py-16 md:py-24 overflow-hidden">
    <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)' }} />
    <div className="container mx-auto px-5 md:px-12 max-w-5xl relative">
      <Reveal>
        <h2 className="font-display font-bold leading-[1.05] mb-10 md:mb-12 text-center" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.6rem)' }}>מה יש לכם להפסיד?</h2>
      </Reveal>
      <div className="grid md:grid-cols-2 gap-5 md:gap-7">
        <Reveal>
          <div className="h-full rounded-3xl bg-brand-navyDark/15 border border-white/25 p-7 md:p-9">
            <div className="font-display font-bold text-white/80 text-lg md:text-xl mb-2">במקרה הכי גרוע?</div>
            <p className="text-white/95 text-lg md:text-2xl leading-relaxed font-display font-bold">תגיעו לשידור הראשון, תחשבו שזה חרטה ברטה, ותמשיכו בחייכם.</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl bg-brand-navyDark p-7 md:p-9 shadow-xl">
            <div className="font-display font-bold text-brand-orangeLight text-lg md:text-xl mb-2">במקרה הכי טוב?</div>
            <p className="text-white text-lg md:text-2xl leading-relaxed font-display font-bold">תבינו איך להשתמש בכישורים והניסיון שכבר יש לכם בכדי לייצר הכנסה של 5,000–8,000 ש"ח שתשמש לכם ולמשפחה שלכם ככרית ביטחון כלכלית בתוך 60 יום.</p>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ---- who it's for ----
const WhoFor = () => (
  <section className="bg-brand-navyDark py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-5xl">
      <Reveal>
        <h2 className="font-display font-bold text-white text-center leading-[1.05] mb-12" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.6rem)' }}>
          זה <span className="text-brand-orange">בשבילכם?</span>
        </h2>
      </Reveal>
      <div className="grid md:grid-cols-2 gap-5 md:gap-7">
        <Reveal>
          <div className="h-full rounded-3xl bg-white/[0.04] border border-brand-orange/40 p-7 md:p-9">
            <h3 className="flex items-center gap-3 font-display font-bold text-white text-2xl md:text-3xl mb-5">
              <span className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center shrink-0"><CheckCircle2 size={22} className="text-white" strokeWidth={2.6} /></span>
              בשבילכם אם
            </h3>
            <ul className="space-y-3.5 text-white/80 text-lg md:text-xl">
              {['אתם שכירים עם 10+ שנות ניסיון.', 'שתי משכורות נכנסות ועדיין צפוף בסוף החודש.', 'רוצים הכנסה נוספת אבל לא יודעים מאיפה להתחיל.'].map((x, i) => (
                <li key={i} className="flex items-start gap-3"><CheckCircle2 size={20} className="text-brand-orange shrink-0 mt-1" /> {x}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl bg-white/[0.02] border border-white/10 p-7 md:p-9">
            <h3 className="flex items-center gap-3 font-display font-bold text-white/85 text-2xl md:text-3xl mb-5">
              <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"><XCircle size={22} className="text-white/70" strokeWidth={2.6} /></span>
              לא בשבילכם אם
            </h3>
            <ul className="space-y-3.5 text-white/55 text-lg md:text-xl">
              {['אתם מחפשים כפתור קסם או להתעשר מהר.', 'לא מוכנים להשקיע אפילו שעה ביום.'].map((x, i) => (
                <li key={i} className="flex items-start gap-3"><XCircle size={20} className="text-white/35 shrink-0 mt-1" /> {x}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ---- tax reassurance ----
const Tax = () => (
  <section className="bg-brand-navy py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-3xl">
      <Reveal>
        <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-8 md:p-12">
          <h2 className="font-display font-bold text-white leading-[1.15] mb-6 text-center" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)' }}>
            "אבל אני אצטרך לפתוח עסק ולשלם מיסים?"
          </h2>
          <div className="text-white/70 text-lg md:text-xl leading-relaxed space-y-4">
            <p>שאלה טובה, וזה בדיוק הפחד שעוצר את רוב האנשים.</p>
            <p>אז בואו נרגיע אתכם: כן, בשלב מסוים פותחים עוסק פטור, וזה הרבה יותר פשוט וזול ממה שאתם מדמיינים, צעד אחר צעד, ואנחנו נלווה אתכם לאורך כל הדרך.</p>
            <p>אבל זה ממש לא הדבר הראשון. <span className="text-white font-display font-bold">החלק המפחיד באמת הוא לא המיסים, הוא פשוט להבין קודם כל אם יש לכם בכלל משהו ששווה כסף. <span className="text-brand-orange">בדיוק את זה נעשה ביום הראשון.</span></span></p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

// ---- founders ----
const Founders = () => (
  <section className="bg-brand-navyDark py-16 md:py-24">
    <div className="container mx-auto px-5 md:px-12 max-w-5xl">
      <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
        <Reveal>
          <div className="flex md:flex-col gap-4 justify-center">
            {[{ src: '/images/efrat.jpg', n: 'אפרת קולברג' }, { src: '/images/arzit.jpg', n: 'ארזית נחום' }].map((f) => (
              <div key={f.n} className="text-center">
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-3xl overflow-hidden border-2 border-brand-orange/60 shadow-xl mx-auto">
                  <img src={f.src} alt={f.n} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="font-display font-bold text-white mt-2.5 md:text-lg">{f.n}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div>
            <h2 className="font-display font-bold text-white leading-[1.05] mb-5" style={{ fontSize: 'clamp(1.9rem, 4vw, 3.2rem)' }}>
              גם אנחנו <span className="text-brand-orange">היינו שכירות.</span>
            </h2>
            <div className="text-white/70 text-lg md:text-xl leading-relaxed space-y-4">
              <p>אנחנו אפרת קולברג וארזית נחום, ושתינו היינו שכירות. ארזית ניהלה את השיווק בחברת DHL תמורת <strong className="text-white">12,000 ש"ח בחודש</strong>, עד שפיטרו אותה, ואותו ידע בדיוק התחיל להכניס לה <strong className="text-brand-orange">950 ש"ח על שעת ייעוץ אחת</strong>.</p>
              <p>היום אנחנו מנהלות יחד חברת ייעוץ עסקי, ובשנה האחרונה ליווינו מאות אנשים. עכשיו אנחנו לוקחות את כל מה שלמדנו, ומלמדות אתכם איך לעשות בדיוק את אותו הדבר, צעד אחר צעד.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ---- FAQ ----
const FAQS = [
  { q: 'מתי?', a: '28–31 ביוני, כל ערב ב-20:00.' },
  { q: 'כמה זמן?', a: '30 דקות ביום, 4 ימים.' },
  { q: 'איפה?', a: 'בלייב מהבית, דרך זום.' },
  { q: 'כמה זה עולה?', a: 'ללא עלות, וללא הגבלת מקומות.' },
  { q: 'תהיה הקלטה?', a: 'השידור בלייב בלבד. מי שלא מגיע, מפספס.' },
];
const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-brand-navy py-16 md:py-24">
      <div className="container mx-auto px-5 md:px-12 max-w-3xl">
        <Reveal>
          <h2 className="font-display font-bold text-white text-center leading-[1.05] mb-10" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.6rem)' }}>
            איך זה <span className="text-brand-orange">עובד?</span>
          </h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-5 md:px-7 py-5 flex items-center justify-between gap-4 text-right">
                  <span className={`font-display font-bold text-lg md:text-xl ${open === i ? 'text-brand-orange' : 'text-white'}`}>{f.q}</span>
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${open === i ? 'bg-brand-orange text-white' : 'bg-white/10 text-brand-orange'}`}>
                    {open === i ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                  </span>
                </button>
                <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden"><p className="px-5 md:px-7 pb-5 text-white/65 text-base md:text-lg leading-relaxed">{f.a}</p></div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// ---- final CTA ----
const FinalCTA = () => (
  <section className="relative bg-brand-orange text-white py-20 md:py-28 overflow-hidden">
    <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #fff, transparent 55%)' }} />
    <div className="container mx-auto px-5 md:px-12 max-w-2xl relative text-center">
      <Reveal>
        <h2 className="font-display font-bold leading-[1.05] mb-4" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>סוף החודש הבא יכול להיראות אחרת.</h2>
        <p className="text-white/85 font-display font-bold text-lg md:text-2xl mb-8">28–31.6 · 20:00 בערב · בלייב · ללא עלות</p>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="bg-white/10 rounded-[28px] p-2 backdrop-blur border border-white/20">
          <RegistrationForm id="register-bottom" />
        </div>
        <p className="font-display font-bold text-white text-xl md:text-2xl mt-8">מחכות לראות אתכם שם, אפרת וארזית.</p>
      </Reveal>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-brand-navyDark text-white/45 py-9 text-center text-sm border-t border-white/10">
    <div className="container mx-auto px-5 space-y-1.5">
      <p className="font-display font-bold text-white/80 text-base">עסק לכולם</p>
      <p>אפרת קולברג + ארזית נחום</p>
      <p>© עסק לכולם · כל הזכויות שמורות · פרטיותכם נשמרת</p>
      <p className="text-xs pt-1"><a href="/privacy.html" className="hover:text-white underline">מדיניות פרטיות</a> · <a href="/accessibility.html" className="hover:text-white underline">הצהרת נגישות</a></p>
    </div>
  </footer>
);

const AppA = () => (
  <div className="bg-brand-navyDark min-h-screen overflow-x-clip" dir="rtl">
    <CountdownBar />
    <Hero />
    <PromiseBand />
    <DaysTimeline />
    <FormSection id="register-top" />
    <RiskBand />
    <WhoFor />
    <Tax />
    <Founders />
    <FAQ />
    <FinalCTA />
    <Footer />
  </div>
);

// Variants consolidated; ?v=b / ?v=c still resolve.
const App = () => <AppA />;
export default App;
