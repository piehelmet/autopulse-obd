/* AutoPulse OBD2 — trip recorder (runs in the background while connected) */

import { connection } from '../obd/connection.js';
import { addTrip, getState, activeVehicle } from './store.js';
import { clamp } from './utils.js';

export const trip = {
  active: false,
  auto: false,
  startedAt: 0,
  lastAt: 0,
  distanceKm: 0,
  fuelUsedL: 0,
  maxSpeedKmh: 0,
  speedIntegral: 0,
  movingSeconds: 0,
  idleSeconds: 0,
  startFuel: null,
  samples: { t: [], speed: [], fuel: [] },
  lastSampleAt: 0,
  vehicleId: null,
  vehicleName: '',
};

let lastStopAt = 0;
let idleTimer = 0;

const reset = () => {
  trip.active = false;
  trip.auto = false;
  trip.startedAt = 0;
  trip.lastAt = 0;
  trip.distanceKm = 0;
  trip.fuelUsedL = 0;
  trip.maxSpeedKmh = 0;
  trip.speedIntegral = 0;
  trip.movingSeconds = 0;
  trip.idleSeconds = 0;
  trip.startFuel = null;
  trip.samples = { t: [], speed: [], fuel: [] };
  trip.lastSampleAt = 0;
  trip.vehicleId = null;
  trip.vehicleName = '';
  idleTimer = 0;
};

export const startTrip = ({ auto = false } = {}) => {
  if (trip.active) return trip;
  const v = activeVehicle();
  reset();
  trip.active = true;
  trip.auto = auto;
  trip.startedAt = Date.now();
  trip.lastAt = trip.startedAt;
  trip.vehicleId = v?.id || null;
  trip.vehicleName = v ? `${v.make} ${v.model}` : 'Vehicle';
  trip.startFuel = connection.values.fuelLevel ?? null;
  return trip;
};

export const stopTrip = () => {
  if (!trip.active) return null;
  const endedAt = Date.now();
  const duration = Math.max(0, (endedAt - trip.startedAt) / 1000);
  const avgConsumption = trip.distanceKm > 0.05 ? (trip.fuelUsedL / trip.distanceKm) * 100 : null;
  const price = Number(getState().settings.fuelPrice) || 0;
  const result = {
    startedAt: trip.startedAt,
    endedAt,
    duration,
    distanceKm: trip.distanceKm,
    fuelUsedL: trip.fuelUsedL,
    maxSpeedKmh: trip.maxSpeedKmh,
    avgSpeedKmh: duration > 0 ? trip.distanceKm / (duration / 3600) : 0,
    avgConsumption,
    cost: trip.fuelUsedL * price,
    idleSeconds: trip.idleSeconds,
    movingSeconds: trip.movingSeconds,
    startFuel: trip.startFuel,
    endFuel: connection.values.fuelLevel ?? null,
    vehicleId: trip.vehicleId,
    vehicleName: trip.vehicleName,
    samples: {
      t: [...trip.samples.t],
      speed: [...trip.samples.speed],
      fuel: [...trip.samples.fuel],
    },
  };
  addTrip(result);
  lastStopAt = endedAt;
  reset();
  return result;
};

export const liveTrip = () => {
  const duration = trip.active ? Math.max(0, (Date.now() - trip.startedAt) / 1000) : 0;
  return {
    duration,
    distanceKm: trip.distanceKm,
    fuelUsedL: trip.fuelUsedL,
    maxSpeedKmh: trip.maxSpeedKmh,
    avgSpeedKmh: duration > 0 ? trip.distanceKm / (duration / 3600) : 0,
    avgConsumption: trip.distanceKm > 0.05 ? (trip.fuelUsedL / trip.distanceKm) * 100 : null,
    cost: trip.fuelUsedL * (Number(getState().settings.fuelPrice) || 0),
    idleSeconds: trip.idleSeconds,
  };
};

const accumulate = (values) => {
  const now = Date.now();
  const dt = clamp((now - trip.lastAt) / 1000, 0, 3);
  trip.lastAt = now;
  const speed = Math.max(0, Number(values.speed) || 0);
  const fuelRate = Math.max(0, Number(values.fuelRate) || 0);

  trip.distanceKm += (speed * dt) / 3600;
  trip.fuelUsedL += (fuelRate * dt) / 3600;
  trip.maxSpeedKmh = Math.max(trip.maxSpeedKmh, speed);
  trip.speedIntegral += speed * dt;
  if (speed > 2) trip.movingSeconds += dt;
  else trip.idleSeconds += dt;

  if (now - trip.lastSampleAt > 1000) {
    trip.lastSampleAt = now;
    trip.samples.t.push((now - trip.startedAt) / 1000);
    trip.samples.speed.push(speed);
    trip.samples.fuel.push(fuelRate);
    if (trip.samples.t.length > 2400) {
      trip.samples.t.shift();
      trip.samples.speed.shift();
      trip.samples.fuel.shift();
    }
  }
};

export const initTripRecorder = () => {
  const off = connection.on('data', (values) => {
    const autoRecord = getState().settings.autoRecordTrips;
    if (!trip.active) {
      if (autoRecord && (Number(values.speed) || 0) > 4 && Date.now() - lastStopAt > 20000) {
        startTrip({ auto: true });
      }
      return;
    }
    accumulate(values);
    if (trip.auto) {
      if ((Number(values.speed) || 0) < 1.5) idleTimer += 0.25;
      else idleTimer = 0;
      if (idleTimer > 180) stopTrip();
    }
  });
  return off;
};
