/* AutoPulse OBD2 — short rolling history for charts and sparklines */

const MAX_POINTS = 360;
const buffers = new Map();

export const record = (values, at = Date.now()) => {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    let buf = buffers.get(key);
    if (!buf) {
      buf = { t: [], v: [] };
      buffers.set(key, buf);
    }
    buf.t.push(at);
    buf.v.push(value);
    if (buf.v.length > MAX_POINTS) {
      buf.v.shift();
      buf.t.shift();
    }
  });
};

export const getHistory = (key) => buffers.get(key) || { t: [], v: [] };

export const getSeries = (keys = [], points = 120) =>
  keys.map((key) => {
    const buf = getHistory(key);
    return { key, data: buf.v.slice(-points) };
  });

export const clearHistory = () => buffers.clear();

export const lastN = (key, n = 120) => getHistory(key).v.slice(-n);
