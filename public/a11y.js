/* Hebrew accessibility widget (self-hosted, IL Equality of Rights Law compliance).
 * Floating button bottom-left → menu with: font size +/-, contrast toggle, animation kill, link highlight, link underline, cursor enlarge.
 * Persistence via localStorage. ARIA-compliant. Keyboard navigable.
 */
(function () {
  if (window.__bex_a11y_loaded) return;
  window.__bex_a11y_loaded = true;

  var STORAGE_KEY = 'bex_a11y_state';
  var state = { fontScale: 1, contrast: false, noAnim: false, highlightLinks: false, underlineLinks: false, bigCursor: false };
  try { var saved = localStorage.getItem(STORAGE_KEY); if (saved) state = Object.assign(state, JSON.parse(saved)); } catch (e) {}

  var css = document.createElement('style');
  css.appendChild(document.createTextNode('\
    #a11y-btn { position: fixed; bottom: 16px; left: 16px; z-index: 99999; width: 56px; height: 56px; border-radius: 50%; background: #1a4d8f; color: #fff; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 28px; line-height: 1; padding: 0; }\
    #a11y-btn:hover, #a11y-btn:focus { background: #0d3a72; outline: 3px solid #ffb84d; outline-offset: 2px; }\
    #a11y-panel { position: fixed; bottom: 84px; left: 16px; z-index: 99999; background: #fff; border: 2px solid #1a4d8f; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 16px; width: 280px; max-width: calc(100vw - 32px); font-family: Heebo, Arial, sans-serif; color: #1a1a2e; direction: rtl; text-align: right; display: none; }\
    #a11y-panel.open { display: block; }\
    #a11y-panel h2 { font-size: 18px; margin: 0 0 12px; font-weight: 700; }\
    #a11y-panel button.a11y-opt { display: flex; align-items: center; gap: 8px; width: 100%; text-align: right; padding: 10px 12px; margin: 4px 0; background: #f4f4f8; border: 2px solid transparent; border-radius: 8px; font-size: 15px; cursor: pointer; color: #1a1a2e; font-family: inherit; }\
    #a11y-panel button.a11y-opt:hover, #a11y-panel button.a11y-opt:focus { background: #e8eef6; outline: 2px solid #1a4d8f; }\
    #a11y-panel button.a11y-opt.active { background: #1a4d8f; color: #fff; border-color: #ffb84d; }\
    #a11y-panel .a11y-row { display: flex; gap: 8px; }\
    #a11y-panel .a11y-row button { flex: 1; }\
    #a11y-panel .a11y-reset { background: #c81e1e; color: #fff; margin-top: 8px; }\
    #a11y-panel .a11y-reset:hover, #a11y-panel .a11y-reset:focus { background: #a01717; }\
    #a11y-panel .a11y-link { display: block; text-align: center; margin-top: 10px; font-size: 13px; color: #1a4d8f; text-decoration: underline; }\
    html[data-a11y-contrast="true"] body, html[data-a11y-contrast="true"] body * { background: #000 !important; color: #ffff00 !important; border-color: #ffff00 !important; }\
    html[data-a11y-contrast="true"] body a, html[data-a11y-contrast="true"] body a * { color: #00ffff !important; }\
    html[data-a11y-contrast="true"] body img, html[data-a11y-contrast="true"] body video, html[data-a11y-contrast="true"] body iframe { filter: grayscale(1) contrast(1.1); }\
    html[data-a11y-no-anim="true"] *, html[data-a11y-no-anim="true"] *::before, html[data-a11y-no-anim="true"] *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }\
    html[data-a11y-highlight-links="true"] a { background: #ffff00 !important; color: #000 !important; padding: 2px 4px; border-radius: 3px; }\
    html[data-a11y-underline-links="true"] a { text-decoration: underline !important; }\
  '));
  document.head.appendChild(css);

  // Build DOM nodes programmatically (safe — no innerHTML)
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) { for (var k in attrs) n.setAttribute(k, attrs[k]); }
    if (text != null) n.appendChild(document.createTextNode(text));
    return n;
  }

  function apply() {
    document.documentElement.style.fontSize = (state.fontScale === 1 ? '' : (130 * state.fontScale) + '%');
    document.documentElement.setAttribute('data-a11y-contrast', String(state.contrast));
    document.documentElement.setAttribute('data-a11y-no-anim', String(state.noAnim));
    document.documentElement.setAttribute('data-a11y-highlight-links', String(state.highlightLinks));
    document.documentElement.setAttribute('data-a11y-underline-links', String(state.underlineLinks));
    document.documentElement.setAttribute('data-a11y-big-cursor', String(state.bigCursor));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    refreshUI();
  }

  function refreshUI() {
    var btns = document.querySelectorAll('#a11y-panel button.a11y-opt[data-toggle]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var key = b.getAttribute('data-toggle');
      if (state[key]) b.classList.add('active'); else b.classList.remove('active');
    }
  }

  function build() {
    var btn = el('button', { id: 'a11y-btn', 'aria-label': 'תפריט נגישות', title: 'תפריט נגישות', 'aria-expanded': 'false', 'aria-controls': 'a11y-panel', type: 'button' });
    var icon = el('span', { 'aria-hidden': 'true' }, '♿'); // wheelchair symbol
    btn.appendChild(icon);
    document.body.appendChild(btn);

    var panel = el('div', { id: 'a11y-panel', role: 'dialog', 'aria-label': 'תפריט נגישות' });
    panel.appendChild(el('h2', null, 'נגישות'));

    var row = el('div', { 'class': 'a11y-row' });
    row.appendChild(el('button', { 'class': 'a11y-opt', 'data-act': 'font-down', type: 'button', 'aria-label': 'הקטן טקסט' }, 'א−'));
    row.appendChild(el('button', { 'class': 'a11y-opt', 'data-act': 'font-up', type: 'button', 'aria-label': 'הגדל טקסט' }, 'א+'));
    panel.appendChild(row);

    var opts = [
      { key: 'contrast', label: 'ניגודיות גבוהה' },
      { key: 'noAnim', label: 'עצור אנימציות' },
      { key: 'highlightLinks', label: 'הדגש קישורים' },
      { key: 'underlineLinks', label: 'סמן קישורים בקו' },
      { key: 'bigCursor', label: 'סמן עכבר מוגדל' },
    ];
    for (var i = 0; i < opts.length; i++) {
      panel.appendChild(el('button', { 'class': 'a11y-opt', 'data-toggle': opts[i].key, type: 'button' }, opts[i].label));
    }

    panel.appendChild(el('button', { 'class': 'a11y-opt a11y-reset', 'data-act': 'reset', type: 'button' }, 'איפוס נגישות'));

    var link = el('a', { 'class': 'a11y-link', href: '/accessibility.html', target: '_blank', rel: 'noopener' }, 'הצהרת נגישות');
    panel.appendChild(link);

    document.body.appendChild(panel);

    btn.addEventListener('click', function () {
      var isOpen = panel.classList.contains('open');
      if (isOpen) panel.classList.remove('open'); else panel.classList.add('open');
      btn.setAttribute('aria-expanded', String(!isOpen));
    });

    panel.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      var act = t.getAttribute('data-act');
      var toggle = t.getAttribute('data-toggle');
      if (act === 'font-up') state.fontScale = Math.min(1.5, state.fontScale + 0.1);
      else if (act === 'font-down') state.fontScale = Math.max(0.8, state.fontScale - 0.1);
      else if (act === 'reset') state = { fontScale: 1, contrast: false, noAnim: false, highlightLinks: false, underlineLinks: false, bigCursor: false };
      else if (toggle) state[toggle] = !state[toggle];
      apply();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
