/* AutoPulse OBD2 — per-vehicle history aggregation
 *
 * Records are matched by vehicleId first, then by VIN. That means:
 * - trips recorded before v1.6 still appear because they already stored vehicleId
 * - records copied to another device or profile can follow the car by VIN
 * - older service/performance records without either link are deliberately not
 *   attributed to a vehicle, because guessing would be fabricating history
 */

import { normalizeVin } from '../data/vin.js';

const recordVin = (record) => normalizeVin(record?.vin || '');

export const matchesVehicle = (record, vehicle) => {
  if (!record || !vehicle) return false;
  if (record.vehicleId && record.vehicleId === vehicle.id) return true;
  const vin = normalizeVin(vehicle.vin || '');
  return Boolean(vin && recordVin(record) === vin);
};

const tripAt = (trip) => Number(trip.endedAt || trip.startedAt || trip.createdAt) || 0;

export const collectVehicleHistory = (state, vehicle) => {
  const trips = (state?.trips || [])
    .filter((record) => matchesVehicle(record, vehicle))
    .slice()
    .sort((a, b) => tripAt(b) - tripAt(a));
  const services = (state?.serviceHistory || [])
    .filter((record) => matchesVehicle(record, vehicle))
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  const perf = (state?.perfResults || [])
    .filter((record) => matchesVehicle(record, vehicle))
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

  const timeline = [
    ...trips.map((trip) => ({
      kind: 'trip',
      id: trip.id,
      at: tripAt(trip),
      title: 'Trip',
      subtitle: trip.vehicleName || '',
      distanceKm: Number(trip.distanceKm) || 0,
      duration: Number(trip.duration) || 0,
      maxSpeedKmh: Number(trip.maxSpeedKmh) || 0,
      fuelUsedL: Number(trip.fuelUsedL) || 0,
    })),
    ...services.map((record) => ({
      kind: 'service',
      id: record.id,
      at: Number(record.createdAt) || 0,
      title: record.name || 'Service record',
      subtitle: record.module || '',
      status: record.status || '',
      mode: record.mode || '',
    })),
    ...perf.map((record) => ({
      kind: 'perf',
      id: record.id,
      at: Number(record.createdAt) || 0,
      title: record.label || 'Performance run',
      subtitle: record.mode || '',
      value: Number(record.value) || 0,
      maxSpeedKmh: Number(record.maxSpeedKmh) || 0,
    })),
  ].sort((a, b) => b.at - a.at);

  const distanceKm = trips.reduce((total, trip) => total + (Number(trip.distanceKm) || 0), 0);
  const fuelUsedL = trips.reduce((total, trip) => total + (Number(trip.fuelUsedL) || 0), 0);

  const best = new Map();
  perf.forEach((record) => {
    const key = record.testId || record.label || 'run';
    const value = Number(record.value);
    if (!Number.isFinite(value)) return;
    const current = best.get(key);
    if (!current || value < current.value) {
      best.set(key, { testId: key, label: record.label || key, value });
    }
  });

  return {
    trips,
    services,
    perf,
    timeline,
    stats: {
      tripCount: trips.length,
      distanceKm,
      fuelUsedL,
      serviceCount: services.length,
      perfCount: perf.length,
      firstAt: timeline.length ? timeline[timeline.length - 1].at : 0,
      lastAt: timeline.length ? timeline[0].at : 0,
      bestPerf: [...best.values()].sort((a, b) => a.label.localeCompare(b.label)),
    },
  };
};
