/* AutoPulse OBD2 — persistent application store */

import { uid, debounce } from './utils.js';

const KEY = 'autopulse.state.v1';
const VERSION = 1;

const demoVehicle = () => ({
  id: 'veh_demo',
  name: 'Demo Golf',
  make: 'Volkswagen',
  model: 'Golf 1.4 TSI',
  year: 2021,
  vin: 'WVWZZZAUZMW000001',
  plate: 'AP-2021',
  fuel: 'Gasoline',
  tank: 55,
  odometer: 48210,
  color: '#28e0b9',
  notes: 'Simulated vehicle used for the offline demo.',
  createdAt: Date.now(),
});

export const defaultDashboards = () => [
  {
    id: 'dash_main',
    name: 'Main',
    items: [
      { id: uid('it'), pid: 'rpm', type: 'gauge', w: 3, h: 2 },
      { id: uid('it'), pid: 'speed', type: 'gauge', w: 3, h: 2 },
      { id: uid('it'), pid: 'coolant', type: 'gauge', w: 3, h: 2 },
      { id: uid('it'), pid: 'fuelLevel', type: 'gauge', w: 3, h: 2 },
      { id: uid('it'), pid: 'voltage', type: 'num', w: 3, h: 1 },
      { id: uid('it'), pid: 'intake', type: 'num', w: 3, h: 1 },
      { id: uid('it'), pid: 'throttle', type: 'bar', w: 3, h: 1 },
      { id: uid('it'), pid: 'load', type: 'bar', w: 3, h: 1 },
    ],
  },
  {
    id: 'dash_power',
    name: 'Powertrain',
    items: [
      { id: uid('it'), pid: 'rpm', type: 'gauge', w: 4, h: 2 },
      { id: uid('it'), pid: 'maf', type: 'gauge', w: 4, h: 2 },
      { id: uid('it'), pid: 'map', type: 'gauge', w: 4, h: 2 },
      { id: uid('it'), pid: 'timing', type: 'num', w: 3, h: 1 },
      { id: uid('it'), pid: 'fuelRate', type: 'num', w: 3, h: 1 },
      { id: uid('it'), pid: 'torqueActual', type: 'bar', w: 3, h: 1 },
      { id: uid('it'), pid: 'oilTemp', type: 'num', w: 3, h: 1 },
    ],
  },
];

const defaults = () => ({
  version: VERSION,
  theme: 'dark',
  settings: {
    units: 'metric',
    pollRate: 250,
    autoConnectDemo: true,
    autoRecordTrips: false,
    fuelPrice: 1.75,
    currency: '€',
    hudPrimary: 'speed',
    hudSecondary: 'rpm',
    shiftLight: 6200,
    confirmClearCodes: true,
    showTips: true,
    serialBaud: 38400,
    adapterProtocol: 'auto',
  },
  vehicles: [demoVehicle()],
  activeVehicleId: 'veh_demo',
  dashboards: defaultDashboards(),
  activeDashboardId: 'dash_main',
  trips: [],
  perfResults: [],
  serviceHistory: [],
  favorites: ['rpm', 'speed', 'coolant', 'fuelLevel', 'voltage', 'throttle'],
  customPids: [],
  seenWelcome: false,
  installedAt: Date.now(),
});

const load = () => {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    const merged = {
      ...base,
      ...saved,
      settings: { ...base.settings, ...(saved.settings || {}) },
    };
    // Repair arrays that may be missing or invalid
    for (const k of ['vehicles', 'dashboards', 'trips', 'perfResults', 'serviceHistory', 'favorites', 'customPids']) {
      if (!Array.isArray(merged[k])) merged[k] = base[k];
    }
    if (!merged.vehicles.length) merged.vehicles = base.vehicles;
    if (!merged.dashboards.length) merged.dashboards = base.dashboards;
    if (!merged.vehicles.some((v) => v.id === merged.activeVehicleId)) {
      merged.activeVehicleId = merged.vehicles[0].id;
    }
    if (!merged.dashboards.some((d) => d.id === merged.activeDashboardId)) {
      merged.activeDashboardId = merged.dashboards[0].id;
    }
    return merged;
  } catch (err) {
    console.warn('AutoPulse: failed to load saved state', err);
    return base;
  }
};

let state = load();
const listeners = new Set();

const persist = debounce(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('AutoPulse: failed to save state', err);
  }
}, 180);

export const getState = () => state;

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const setState = (mutator, { silent = false } = {}) => {
  mutator(state);
  persist();
  if (!silent) listeners.forEach((fn) => fn(state));
  return state;
};

export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('AutoPulse: failed to save state', err);
  }
};

export const resetState = () => {
  state = defaults();
  save();
  listeners.forEach((fn) => fn(state));
  return state;
};

export const exportState = () => JSON.stringify(state, null, 2);

export const importState = (text) => {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('Backup is not a valid object');
  if (!Array.isArray(parsed.vehicles) && !parsed.settings) throw new Error('Backup does not look like an AutoPulse backup');
  const base = defaults();
  state = {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...(parsed.settings || {}) },
  };
  save();
  listeners.forEach((fn) => fn(state));
  return state;
};

export const activeVehicle = () => state.vehicles.find((v) => v.id === state.activeVehicleId) || state.vehicles[0];

export const updateVehicle = (vehicle) => {
  setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === vehicle.id);
    if (idx >= 0) s.vehicles[idx] = { ...s.vehicles[idx], ...vehicle };
    else s.vehicles.push({ ...vehicle, id: vehicle.id || uid('veh') });
    if (!s.activeVehicleId) s.activeVehicleId = vehicle.id;
  });
};

export const addVehicle = (vehicle) => {
  const v = {
    id: uid('veh'),
    createdAt: Date.now(),
    ...vehicle,
  };
  setState((s) => {
    s.vehicles.push(v);
    s.activeVehicleId = v.id;
  });
  return v;
};

export const removeVehicle = (id) => {
  setState((s) => {
    s.vehicles = s.vehicles.filter((v) => v.id !== id);
    if (!s.vehicles.length) s.vehicles = [demoVehicle()];
    if (s.activeVehicleId === id) s.activeVehicleId = s.vehicles[0].id;
  });
};

export const setActiveVehicle = (id) => {
  setState((s) => {
    if (s.vehicles.some((v) => v.id === id)) s.activeVehicleId = id;
  });
};

export const toggleFavorite = (key) => {
  setState((s) => {
    const i = s.favorites.indexOf(key);
    if (i >= 0) s.favorites.splice(i, 1);
    else s.favorites.push(key);
  });
};

export const addTrip = (trip) => {
  setState((s) => {
    s.trips.unshift({ id: uid('trip'), createdAt: Date.now(), ...trip });
    if (s.trips.length > 200) s.trips.length = 200;
  });
};

export const removeTrip = (id) => {
  setState((s) => {
    s.trips = s.trips.filter((t) => t.id !== id);
  });
};

export const addPerfResult = (result) => {
  setState((s) => {
    s.perfResults.unshift({ id: uid('perf'), createdAt: Date.now(), ...result });
    if (s.perfResults.length > 100) s.perfResults.length = 100;
  });
};

export const addServiceRecord = (record) => {
  setState((s) => {
    s.serviceHistory.unshift({ id: uid('svc'), createdAt: Date.now(), ...record });
    if (s.serviceHistory.length > 100) s.serviceHistory.length = 100;
  });
};

export const stateKey = KEY;
