import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initBexTrack } from './track';
import './index.css';

// A/B routing: 50/50 split between B and C. Sticky per visitor via localStorage.
// Respects explicit `?v=a|b|c` if user/marketer set it directly.
(function abTest() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('v')) return; // explicit variant wins (preview, debug, ad-set-specific UTM)
    let v = localStorage.getItem('bex_variant');
    if (v !== 'a' && v !== 'b' && v !== 'c' && v !== 'd') {
      v = (['a', 'b', 'c', 'd'] as const)[Math.floor(Math.random() * 4)];
      localStorage.setItem('bex_variant', v);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', v);
    window.history.replaceState(null, '', url.toString());
  } catch { /* localStorage may be blocked — fall through to AppA */ }
})();

// page analytics — runs AFTER the variant is resolved so the session records the right one
initBexTrack();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);