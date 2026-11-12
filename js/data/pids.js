/* AutoPulse OBD2 — PID database (SAE J1979 Mode 01) */

const u8 = (b) => b[0] || 0;
const u16 = (b) => ((b[0] || 0) << 8) | (b[1] || 0);
const u32 = (b) => ((u16([b[0], b[1]]) * 65536) + u16([b[2], b[3]]));
const pct = (b) => (u8(b) * 100) / 255;
const temp = (b) => u8(b) - 40;
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

const pid = (o) => ({
  mode: '01',
  bytes: 1,
  decimals: 0,
  gauge: 'arc',
  ...o,
});

export const PIDS = [
  pid({
    key: 'rpm', pid: '0C', name: 'Engine speed', short: 'RPM', unit: 'rpm', category: 'Engine',
    min: 0, max: 7000, bytes: 2, decimals: 0, gauge: 'arc', priority: 1,
    decode: (b) => u16(b) / 4, encode: (v) => [Math.floor((v * 4) / 256), (v * 4) % 256],
  }),
  pid({
    key: 'speed', pid: '0D', name: 'Vehicle speed', short: 'Speed', unit: 'km/h', category: 'Vehicle',
    min: 0, max: 240, decimals: 0, gauge: 'arc', priority: 1,
    decode: (b) => u8(b), encode: (v) => [clamp255(v)],
  }),
  pid({
    key: 'load', pid: '04', name: 'Calculated engine load', short: 'Load', unit: '%', category: 'Engine',
    min: 0, max: 100, decimals: 0, gauge: 'bar', priority: 1,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'coolant', pid: '05', name: 'Engine coolant temperature', short: 'Coolant', unit: '°C', category: 'Temperature',
    min: -40, max: 130, decimals: 0, gauge: 'arc', priority: 1,
    decode: (b) => temp(b), encode: (v) => [clamp255(v + 40)],
  }),
  pid({
    key: 'intake', pid: '0F', name: 'Intake air temperature', short: 'Intake', unit: '°C', category: 'Temperature',
    min: -40, max: 100, decimals: 0, gauge: 'arc', priority: 2,
    decode: (b) => temp(b), encode: (v) => [clamp255(v + 40)],
  }),
  pid({
    key: 'ambient', pid: '46', name: 'Ambient air temperature', short: 'Ambient', unit: '°C', category: 'Temperature',
    min: -40, max: 60, decimals: 0, gauge: 'num', priority: 2,
    decode: (b) => temp(b), encode: (v) => [clamp255(v + 40)],
  }),
  pid({
    key: 'oilTemp', pid: '5C', name: 'Engine oil temperature', short: 'Oil', unit: '°C', category: 'Temperature',
    min: -40, max: 160, decimals: 0, gauge: 'arc', priority: 2,
    decode: (b) => temp(b), encode: (v) => [clamp255(v + 40)],
  }),
  pid({
    key: 'throttle', pid: '11', name: 'Throttle position', short: 'Throttle', unit: '%', category: 'Engine',
    min: 0, max: 100, decimals: 0, gauge: 'bar', priority: 1,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'pedal', pid: '49', name: 'Accelerator pedal position', short: 'Pedal', unit: '%', category: 'Engine',
    min: 0, max: 100, decimals: 0, gauge: 'bar', priority: 2,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'cmdThrottle', pid: '4C', name: 'Commanded throttle actuator', short: 'Cmd throttle', unit: '%', category: 'Engine',
    min: 0, max: 100, decimals: 0, gauge: 'bar', priority: 3,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'maf', pid: '10', name: 'Mass air flow', short: 'MAF', unit: 'g/s', category: 'Air', min: 0, max: 400,
    decimals: 1, gauge: 'bar', bytes: 2, priority: 2,
    decode: (b) => u16(b) / 100, encode: (v) => [Math.floor(v * 100 / 256), Math.round(v * 100) % 256],
  }),
  pid({
    key: 'map', pid: '0B', name: 'Intake manifold pressure', short: 'MAP', unit: 'kPa', category: 'Air', min: 0, max: 255,
    decimals: 0, gauge: 'bar', priority: 2,
    decode: (b) => u8(b), encode: (v) => [clamp255(v)],
  }),
  pid({
    key: 'baro', pid: '33', name: 'Barometric pressure', short: 'Baro', unit: 'kPa', category: 'Air', min: 0, max: 120,
    decimals: 0, gauge: 'num', priority: 3,
    decode: (b) => u8(b), encode: (v) => [clamp255(v)],
  }),
  pid({
    key: 'timing', pid: '0E', name: 'Timing advance', short: 'Timing', unit: '°', category: 'Engine', min: -64, max: 64,
    decimals: 1, gauge: 'num', priority: 3,
    decode: (b) => u8(b) / 2 - 64, encode: (v) => [clamp255((v + 64) * 2)],
  }),
  pid({
    key: 'fuelLevel', pid: '2F', name: 'Fuel tank level', short: 'Fuel', unit: '%', category: 'Fuel', min: 0, max: 100,
    decimals: 0, gauge: 'arc', priority: 1,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'fuelRate', pid: '5E', name: 'Engine fuel rate', short: 'Fuel rate', unit: 'L/h', category: 'Fuel', min: 0, max: 60,
    decimals: 1, gauge: 'bar', bytes: 2, priority: 2,
    decode: (b) => u16(b) / 20, encode: (v) => [Math.floor((v * 20) / 256), Math.round(v * 20) % 256],
  }),
  pid({
    key: 'fuelPressure', pid: '0A', name: 'Fuel pressure', short: 'Fuel press.', unit: 'kPa', category: 'Fuel', min: 0, max: 765,
    decimals: 0, gauge: 'num', priority: 3,
    decode: (b) => u8(b) * 3, encode: (v) => [clamp255(v / 3)],
  }),
  pid({
    key: 'railPressure', pid: '23', name: 'Fuel rail pressure', short: 'Rail press.', unit: 'kPa', category: 'Fuel',
    min: 0, max: 655350, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b) * 10, encode: (v) => [Math.floor(v / 2560), Math.round(v / 10) % 256],
  }),
  pid({
    key: 'equivRatio', pid: '44', name: 'Commanded equivalence ratio', short: 'Lambda', unit: 'λ', category: 'Fuel',
    min: 0, max: 2, decimals: 2, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b) / 32768, encode: (v) => [Math.floor((v * 32768) / 256), Math.round(v * 32768) % 256],
  }),
  pid({
    key: 'voltage', pid: '42', name: 'Control module voltage', short: 'Battery', unit: 'V', category: 'Electrical',
    min: 0, max: 18, decimals: 2, gauge: 'num', bytes: 2, priority: 1,
    decode: (b) => u16(b) / 1000, encode: (v) => [Math.floor((v * 1000) / 256), Math.round(v * 1000) % 256],
  }),
  pid({
    key: 'runtime', pid: '1F', name: 'Run time since engine start', short: 'Run time', unit: 's', category: 'Engine',
    min: 0, max: 65535, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b), encode: (v) => [Math.floor(v / 256), v % 256],
  }),
  pid({
    key: 'distanceMil', pid: '21', name: 'Distance with MIL on', short: 'MIL distance', unit: 'km', category: 'Vehicle',
    min: 0, max: 65535, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b), encode: (v) => [Math.floor(v / 256), v % 256],
  }),
  pid({
    key: 'distanceCleared', pid: '31', name: 'Distance since codes cleared', short: 'Since clear', unit: 'km', category: 'Vehicle',
    min: 0, max: 65535, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b), encode: (v) => [Math.floor(v / 256), v % 256],
  }),
  pid({
    key: 'catalyst', pid: '3C', name: 'Catalyst temperature (bank 1)', short: 'Catalyst', unit: '°C', category: 'Temperature',
    min: -40, max: 1200, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b) / 10 - 40, encode: (v) => [Math.floor(((v + 40) * 10) / 256), Math.round((v + 40) * 10) % 256],
  }),
  pid({
    key: 'egrCmd', pid: '2C', name: 'Commanded EGR', short: 'EGR cmd', unit: '%', category: 'Air', min: 0, max: 100,
    decimals: 0, gauge: 'num', priority: 3,
    decode: (b) => pct(b), encode: (v) => [clamp255((v * 255) / 100)],
  }),
  pid({
    key: 'egrError', pid: '2D', name: 'EGR error', short: 'EGR error', unit: '%', category: 'Air', min: -100, max: 100,
    decimals: 0, gauge: 'num', priority: 3,
    decode: (b) => u8(b) * (100 / 128) - 100, encode: (v) => [clamp255((v + 100) * 1.28)],
  }),
  pid({
    key: 'absLoad', pid: '43', name: 'Absolute load value', short: 'Abs. load', unit: '%', category: 'Engine',
    min: 0, max: 25700, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => (u16(b) * 100) / 255, encode: (v) => [Math.floor((v * 255) / 25600), Math.round((v * 255) / 100) % 256],
  }),
  pid({
    key: 'torqueActual', pid: '62', name: 'Actual engine torque', short: 'Torque', unit: '%', category: 'Engine',
    min: -125, max: 125, decimals: 0, gauge: 'bar', priority: 3,
    decode: (b) => u8(b) - 125, encode: (v) => [clamp255(v + 125)],
  }),
  pid({
    key: 'torqueRef', pid: '63', name: 'Engine reference torque', short: 'Ref. torque', unit: 'Nm', category: 'Engine',
    min: 0, max: 65535, decimals: 0, gauge: 'num', bytes: 2, priority: 3,
    decode: (b) => u16(b), encode: (v) => [Math.floor(v / 256), v % 256],
  }),
  pid({
    key: 'odometer', pid: 'A6', name: 'Odometer', short: 'Odometer', unit: 'km', category: 'Vehicle',
    min: 0, max: 2000000, decimals: 0, gauge: 'num', bytes: 4, priority: 3,
    decode: (b) => u32(b), encode: (v) => [Math.floor(v / 16777216) % 256, Math.floor(v / 65536) % 256, Math.floor(v / 256) % 256, v % 256],
  }),
];

export const PIDS_BY_KEY = Object.fromEntries(PIDS.map((p) => [p.key, p]));
export const PIDS_BY_ID = Object.fromEntries(PIDS.map((p) => [`${p.mode}${p.pid}`, p]));
export const PID_CATEGORIES = [...new Set(PIDS.map((p) => p.category))];
export const CORE_KEYS = ['rpm', 'speed', 'coolant', 'throttle', 'load', 'fuelLevel', 'voltage', 'intake', 'maf', 'fuelRate'];
export const DEFAULT_DASH_KEYS = ['rpm', 'speed', 'coolant', 'fuelLevel', 'voltage', 'intake', 'throttle', 'load'];

export const getPid = (key) => PIDS_BY_KEY[key] || null;
export const getPidById = (mode, id) => PIDS_BY_ID[`${mode}${id}`] || null;

export const pidUnit = (p) => p?.unit || '';

export const FUEL_TYPES = [
  'Not available', 'Gasoline', 'Methanol', 'Ethanol', 'Diesel', 'LPG', 'CNG', 'Propane',
  'Electric', 'Bifuel gasoline', 'Bifuel methanol', 'Bifuel ethanol', 'Bifuel LPG',
  'Bifuel CNG', 'Bifuel propane', 'Bifuel electricity', 'Hybrid gasoline', 'Hybrid ethanol',
  'Hybrid diesel', 'Hybrid electric', 'Hybrid mixed', 'Hybrid regenerative',
];
