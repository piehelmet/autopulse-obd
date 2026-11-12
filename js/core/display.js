/* AutoPulse OBD2 — unit conversion and value formatting */

import { getState } from './store.js';
import { round } from './utils.js';

export const imperial = () => getState().settings.units === 'imperial';

export const speedFactor = () => (imperial() ? 0.621371 : 1);
export const distanceFactor = () => (imperial() ? 0.621371 : 1);
export const volumeFactor = () => (imperial() ? 0.264172 : 1);
export const pressureFactor = () => (imperial() ? 0.145038 : 1);
export const torqueFactor = () => (imperial() ? 0.737562 : 1);

export const convertTemp = (c) => (imperial() ? (c * 9) / 5 + 32 : c);

export const units = () => ({
  speed: imperial() ? 'mph' : 'km/h',
  distance: imperial() ? 'mi' : 'km',
  volume: imperial() ? 'gal' : 'L',
  pressure: imperial() ? 'psi' : 'kPa',
  torque: imperial() ? 'lb-ft' : 'Nm',
  temp: imperial() ? '°F' : '°C',
  consumption: imperial() ? 'MPG' : 'L/100km',
  fuelRate: imperial() ? 'gal/h' : 'L/h',
});

export const displayPid = (pid, raw) => {
  if (raw === null || raw === undefined || Number.isNaN(Number(raw))) {
    return { value: null, unit: pid?.unit || '', decimals: pid?.decimals || 0, text: '—' };
  }
  const v = Number(raw);
  let value = v;
  let unit = pid?.unit || '';
  let decimals = pid?.decimals ?? 0;

  switch (unit) {
    case 'km/h':
      value = v * speedFactor();
      unit = units().speed;
      break;
    case 'km':
      value = v * distanceFactor();
      unit = units().distance;
      break;
    case '°C':
      value = convertTemp(v);
      unit = units().temp;
      decimals = 0;
      break;
    case 'kPa':
      value = v * pressureFactor();
      unit = units().pressure;
      decimals = 0;
      break;
    case 'Nm':
      value = v * torqueFactor();
      unit = units().torque;
      decimals = 0;
      break;
    case 'L/h':
      value = v * volumeFactor();
      unit = units().fuelRate;
      decimals = 2;
      break;
    case 'L':
      value = v * volumeFactor();
      unit = units().volume;
      decimals = 2;
      break;
    default:
      break;
  }
  if (Math.abs(value) >= 1000) decimals = 0;
  return {
    value: round(value, decimals),
    unit,
    decimals,
    text: round(value, decimals).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  };
};

export const formatSpeed = (kmh) => {
  if (kmh === null || kmh === undefined || Number.isNaN(Number(kmh))) return '—';
  return `${Math.round(Number(kmh) * speedFactor())}`;
};

export const formatDistance = (km, digits = 0) => {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return '—';
  return (Number(km) * distanceFactor()).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatTemp = (c, digits = 0) => {
  if (c === null || c === undefined || Number.isNaN(Number(c))) return '—';
  return (convertTemp(Number(c))).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatVolume = (l, digits = 2) => {
  if (l === null || l === undefined || Number.isNaN(Number(l))) return '—';
  return (Number(l) * volumeFactor()).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const consumption = (fuelRateLph, speedKmh) => {
  if (!fuelRateLph || !speedKmh || speedKmh < 4) return { value: null, unit: units().consumption };
  const l100 = (Number(fuelRateLph) / Number(speedKmh)) * 100;
  if (imperial()) return { value: round(235.215 / l100, 1), unit: 'MPG' };
  return { value: round(l100, 1), unit: 'L/100km' };
};

export const rangeKm = (fuelLevelPct, tankLiters, l100 = 7.5) => {
  if (!fuelLevelPct || !tankLiters || !l100) return null;
  const liters = (Number(fuelLevelPct) / 100) * Number(tankLiters);
  return (liters / Number(l100)) * 100;
};

export const formatMoney = (value, currency = '€') =>
  `${currency}${Number(value || 0).toFixed(2)}`;
