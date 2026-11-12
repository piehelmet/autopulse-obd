/* AutoPulse OBD2 — small shared helpers */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const round = (v, d = 0) => {
  const f = 10 ** d;
  return Math.round((Number(v) + Number.EPSILON) * f) / f;
};
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const now = () => Date.now();

export const fmt = (v, d = 0) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};

export const fmtInt = (v) => fmt(v, 0);

export const fmtTime = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const fmtStopwatch = (ms) => {
  const total = Math.max(0, Number(ms) || 0) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m > 0 ? `${m}:` : ''}${s.toFixed(2).padStart(m > 0 ? 5 : 4, '0')}`;
};

export const fmtDate = (ts, withTime = true) => {
  if (!ts) return '—';
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
};

export const fmtClock = (ts = Date.now()) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const debounce = (fn, wait = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

export const throttle = (fn, wait = 100) => {
  let last = 0;
  let timer = null;
  return (...args) => {
    const t = Date.now();
    const remaining = wait - (t - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = t;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
};

export const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
export const max = (arr) => (arr.length ? Math.max(...arr) : 0);

export const download = (filename, text, mime = 'application/json') => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const pickFile = (accept = '.json,application/json') =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });

export const parseHex = (str = '') =>
  (str.replace(/[^0-9a-fA-F]/g, '').match(/.{1,2}/g) || []).map((h) => parseInt(h, 16));

export const toHex = (n, width = 2) => Number(n).toString(16).toUpperCase().padStart(width, '0');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Very small, safe arithmetic evaluator for custom PIDs.
   Supports + - * / % ( ) and byte variables A B C D plus decimal numbers. */
export const evalFormula = (expr, bytes = []) => {
  if (!expr) return NaN;
  const vars = { A: bytes[0] || 0, B: bytes[1] || 0, C: bytes[2] || 0, D: bytes[3] || 0 };
  const cleaned = String(expr).toUpperCase().replace(/\s+/g, '');
  if (!/^[0-9A-D+\-*/%().]+$/.test(cleaned)) throw new Error('Formula contains unsupported characters');
  const replaced = cleaned.replace(/[A-D]/g, (m) => String(vars[m]));
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict";return (${replaced});`);
  const out = fn();
  if (!Number.isFinite(out)) throw new Error('Formula did not produce a number');
  return out;
};

/* Simple friendly relative time */
export const timeAgo = (ts) => {
  const diff = Math.max(0, Date.now() - Number(ts || 0));
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
};
