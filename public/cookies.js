/* Cookie consent banner. Shows once per visitor. Dismiss → localStorage flag. */
(function () {
  if (window.__bex_cookies_loaded) return;
  window.__bex_cookies_loaded = true;
  var KEY = 'bex_cookie_consent';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) { for (var k in attrs) n.setAttribute(k, attrs[k]); }
    if (text != null) n.appendChild(document.createTextNode(text));
    return n;
  }

  var css = document.createElement('style');
  css.appendChild(document.createTextNode('\
    #bex-cookies { position: fixed; bottom: 0; left: 0; right: 0; z-index: 99998; background: #1a1a2e; color: #fff; padding: 14px 16px; box-shadow: 0 -4px 20px rgba(0,0,0,0.25); font-family: Heebo, Arial, sans-serif; direction: rtl; text-align: right; }\
    #bex-cookies .bex-cookies-row { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }\
    #bex-cookies p { margin: 0; font-size: 14px; line-height: 1.5; flex: 1 1 280px; }\
    #bex-cookies a { color: #ffb84d; text-decoration: underline; }\
    #bex-cookies button { background: #E05726; color: #fff; border: 0; padding: 10px 22px; border-radius: 999px; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; flex-shrink: 0; }\
    #bex-cookies button:hover, #bex-cookies button:focus { background: #b8451f; outline: 2px solid #ffb84d; outline-offset: 2px; }\
    @media (max-width: 540px) { #bex-cookies p { font-size: 13px; } #bex-cookies button { width: 100%; } }\
  '));
  document.head.appendChild(css);

  function build() {
    var bar = el('div', { id: 'bex-cookies', role: 'dialog', 'aria-label': 'אישור עוגיות' });
    var row = el('div', { 'class': 'bex-cookies-row' });

    var p = el('p', null);
    p.appendChild(document.createTextNode('האתר משתמש בעוגיות (Cookies) לצורך תפעול, מדידת אפקטיביות ושיווק מחדש. בהמשך השימוש את/ה מסכים/ה לכך, בהתאם ל'));
    var a = el('a', { href: '/privacy.html', target: '_blank', rel: 'noopener' }, 'מדיניות הפרטיות');
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));
    row.appendChild(p);

    var btn = el('button', { type: 'button', 'aria-label': 'אישור עוגיות' }, 'אישור');
    btn.addEventListener('click', function () {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      bar.parentNode && bar.parentNode.removeChild(bar);
    });
    row.appendChild(btn);

    bar.appendChild(row);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
