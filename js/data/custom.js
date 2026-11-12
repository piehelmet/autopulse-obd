/* AutoPulse OBD2 — user-defined PIDs */

import { evalFormula } from '../core/utils.js';
import { getState } from '../core/store.js';

export const customToPid = (c) => ({
  key: `custom_${c.id}`,
  pid: String(c.pid || '1234').toUpperCase(),
  mode: c.mode || '22',
  name: c.name || 'Custom PID',
  short: c.name || 'Custom',
  unit: c.unit || '',
  category: 'Custom',
  min: Number(c.min) || 0,
  max: Number(c.max) || 100,
  decimals: c.decimals ?? 1,
  bytes: Number(c.bytes) || 2,
  custom: true,
  formula: c.formula || 'A',
  decode: (bytes) => {
    try {
      return evalFormula(c.formula || 'A', bytes);
    } catch {
      return NaN;
    }
  },
});

export const allCustomPids = () => (getState().customPids || []).map(customToPid);

export const demoBytesFor = (values = {}) => [
  Math.max(0, Math.round(values.speed || 0)),
  Math.floor((values.rpm || 0) / 256),
  Math.round(values.rpm || 0) % 256,
  Math.max(0, Math.round((values.coolant || 0) + 40)),
];
