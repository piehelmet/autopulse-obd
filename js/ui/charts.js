/* AutoPulse OBD2 — canvas gauges, bars and line charts */

import { clamp } from '../core/utils.js';

const css = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export const palette = () => ({
  accent: css('--accent', '#28e0b9'),
  blue: css('--accent-2', '#4da3ff'),
  purple: css('--accent-3', '#a78bfa'),
  warn: css('--warn', '#ffb020'),
  danger: css('--danger', '#ff4d5e'),
  ok: css('--ok', '#39e08a'),
  line: css('--line', '#1d2e3d'),
  line2: css('--line-2', '#274054'),
  muted: css('--muted', '#7f97ab'),
  text: css('--text', '#e9f2f9'),
  panel: css('--panel', '#0e1721'),
});

const prepare = (canvas) => {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
};

export const gaugeColor = (value, opts = {}) => {
  const c = palette();
  if (opts.dangerAt !== undefined && value >= opts.dangerAt) return c.danger;
  if (opts.warnAt !== undefined && value >= opts.warnAt) return c.warn;
  return opts.color || c.accent;
};

export const drawGauge = (canvas, opts = {}) => {
  const p = prepare(canvas);
  if (!p) return;
  const { ctx, w, h } = p;
  const c = palette();
  const {
    value = 0, min = 0, max = 100, decimals = 0, label = '', unit = '',
    color, warnAt, dangerAt, drawText = false, thickness,
  } = opts;

  const size = Math.min(w, h);
  const lw = thickness || Math.max(6, size * 0.072);
  const cx = w / 2;
  const cy = h / 2 + size * 0.045;
  const r = Math.max(8, size / 2 - lw * 1.6);
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  const frac = clamp((Number(value) - min) / (max - min || 1), 0, 1);
  const col = gaugeColor(Number(value), { color, warnAt, dangerAt });

  ctx.lineCap = 'round';

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = lw;
  ctx.stroke();

  // Soft inner shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - lw * 0.72, start, end);
  ctx.strokeStyle = 'rgba(255,255,255,.028)';
  ctx.lineWidth = Math.max(1, lw * 0.12);
  ctx.stroke();

  // Value arc
  if (frac > 0.002) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, col);
    grad.addColorStop(1, col);
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + (end - start) * frac);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.shadowColor = col;
    ctx.shadowBlur = lw * 0.7;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Ticks
  const ticks = 9;
  ctx.lineCap = 'round';
  for (let i = 0; i < ticks; i += 1) {
    const a = start + ((end - start) * i) / (ticks - 1);
    const r1 = r + lw * 0.62;
    const r2 = r + lw * (i % 2 === 0 ? 1.02 : 0.86);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.strokeStyle = i % 2 === 0 ? c.line2 : c.line;
    ctx.lineWidth = Math.max(1, lw * 0.14);
    ctx.stroke();
  }

  // Redline marker
  if (opts.redline !== undefined && opts.redline > min) {
    const rf = clamp((opts.redline - min) / (max - min || 1), 0, 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r, start + (end - start) * rf, end);
    ctx.strokeStyle = 'rgba(255,77,94,.35)';
    ctx.lineWidth = Math.max(2, lw * 0.28);
    ctx.stroke();
  }

  if (drawText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = c.text;
    ctx.font = `700 ${Math.max(16, size * 0.19)}px 'Cascadia Mono', Consolas, monospace`;
    ctx.fillText(Number(value).toFixed(decimals), cx, cy + size * 0.02);
    ctx.fillStyle = c.muted;
    ctx.font = `700 ${Math.max(8, size * 0.075)}px 'Segoe UI', sans-serif`;
    ctx.fillText((label || unit || '').toUpperCase(), cx, cy + size * 0.15);
  }
};

export const drawSparkline = (canvas, data = [], color) => {
  const p = prepare(canvas);
  if (!p) return;
  const { ctx, w, h } = p;
  const c = palette();
  if (!data.length) return;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color || c.accent;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const last = data[data.length - 1];
  const lx = pad + (data.length - 1) * step;
  const ly = h - pad - ((last - min) / range) * (h - pad * 2);
  ctx.beginPath();
  ctx.arc(lx, ly, 2, 0, Math.PI * 2);
  ctx.fillStyle = color || c.accent;
  ctx.fill();
};

export const drawLineChart = (canvas, series = [], opts = {}) => {
  const p = prepare(canvas);
  if (!p) return;
  const { ctx, w, h } = p;
  const c = palette();
  const padL = opts.padLeft ?? 38;
  const padR = 10;
  const padT = 10;
  const padB = opts.padBottom ?? 18;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);

  const all = series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));
  if (!all.length) {
    ctx.fillStyle = c.muted;
    ctx.font = "600 11px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(opts.emptyText || 'Waiting for data…', w / 2, h / 2);
    return;
  }

  let min = opts.min !== undefined ? opts.min : Math.min(...all);
  let max = opts.max !== undefined ? opts.max : Math.max(...all);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  if (opts.min === undefined) min -= (max - min) * 0.08;
  if (opts.max === undefined) max += (max - min) * 0.08;

  const yFor = (v) => padT + plotH - ((v - min) / (max - min || 1)) * plotH;
  const maxLen = Math.max(...series.map((s) => s.data.length), 2);
  const xFor = (i) => padL + (i / (maxLen - 1)) * plotW;

  // Grid
  ctx.font = "600 9.5px 'Cascadia Mono', Consolas, monospace";
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (plotH * i) / 4;
    const val = max - ((max - min) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.strokeStyle = i === 4 ? c.line2 : c.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.fillText(formatAxis(val), padL - 7, y);
  }

  // X labels
  if (opts.xLabels) {
    ctx.textAlign = 'left';
    ctx.fillStyle = c.muted;
    ctx.fillText(opts.xLabels[0], padL, h - 5);
    ctx.textAlign = 'right';
    ctx.fillText(opts.xLabels[1], w - padR, h - 5);
  }

  series.forEach((s, si) => {
    if (!s.data.length) return;
    const color = s.color || [c.accent, c.blue, c.purple, c.warn][si % 4];
    const step = s.data.length > 1 ? plotW / (maxLen - 1) : 0;
    const offset = (maxLen - s.data.length) * step;

    if (opts.fill !== false && si === 0) {
      const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, hexAlpha(color, 0.22));
      grad.addColorStop(1, hexAlpha(color, 0.01));
      ctx.beginPath();
      ctx.moveTo(padL + offset, padT + plotH);
      s.data.forEach((v, i) => ctx.lineTo(padL + offset + i * step, yFor(v)));
      ctx.lineTo(padL + offset + (s.data.length - 1) * step, padT + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = padL + offset + i * step;
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = opts.lineWidth || 1.9;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    if (s.data.length) {
      const x = padL + offset + (s.data.length - 1) * step;
      const y = yFor(s.data[s.data.length - 1]);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(color, 0.18);
      ctx.fill();
    }
  });
};

const formatAxis = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(0);
  if (abs >= 1) return v.toFixed(1);
  return v.toFixed(2);
};

const hexAlpha = (color, alpha) => {
  const c = String(color).trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
    const n = parseInt(hex.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  return c;
};

export const resizeAll = () => {
  window.dispatchEvent(new CustomEvent('autopulse:resize'));
};
