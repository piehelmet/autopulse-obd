/* AutoPulse OBD2 — realistic demo vehicle simulator */

import { PIDS_BY_KEY } from '../data/pids.js';
import { DEMO_DTCS, READINESS_MONITORS } from '../data/dtc.js';
import { MODE06_DEMO } from '../data/vehicles.js';
import { clamp, toHex } from '../core/utils.js';

const GEAR_TOPS = [32, 58, 88, 122, 165, 230];
const GEAR_FLOORS = [0, 21, 38, 62, 92, 125];
const AUTO_PHASES = [
  { target: 0, duration: 7 },
  { target: 38, duration: 11 },
  { target: 56, duration: 9 },
  { target: 24, duration: 7 },
  { target: 92, duration: 14 },
  { target: 118, duration: 12 },
  { target: 64, duration: 9 },
  { target: 0, duration: 9 },
];

export class DemoVehicle {
  constructor(vehicle = {}) {
    this.vehicle = vehicle;
    this.running = false;
    this.timer = null;
    this.auto = true;
    this.phase = 0;
    this.phaseTime = 0;
    this.target = 0;
    this.throttleInput = 0;
    this.brakeInput = 0;
    this.throttle = 0;
    this.brake = 0;
    this.speed = 0;
    this.rpm = 780;
    this.gear = 1;
    this.coolant = 74;
    this.oil = 68;
    this.intake = 24;
    this.ambient = 19;
    this.fuelLevel = 64;
    this.odometer = Number(vehicle.odometer) || 48210;
    this.runtime = 0;
    this.distanceCleared = 2840;
    this.distanceMil = 12;
    this.battery = 12.5;
    this.dtcs = DEMO_DTCS.map((x) => ({ ...x }));
    this.readinessReset = false;
    this.readinessResetAt = 0;
    this.lastTick = Date.now();
    this.values = {};
    this.update(0.1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTick = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = clamp((now - this.lastTick) / 1000, 0.02, 0.5);
      this.lastTick = now;
      this.update(dt);
    }, 100);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  setVehicle(vehicle) {
    this.vehicle = vehicle || {};
    if (Number(vehicle?.odometer)) this.odometer = Number(vehicle.odometer);
    if (Number(vehicle?.tank)) this.tank = Number(vehicle.tank);
  }

  setAuto(on) {
    this.auto = Boolean(on);
    if (this.auto) {
      this.throttleInput = 0;
      this.brakeInput = 0;
    }
  }

  setThrottle(v) {
    this.auto = false;
    this.throttleInput = clamp(Number(v) || 0, 0, 100);
  }

  setBrake(v) {
    this.auto = false;
    this.brakeInput = clamp(Number(v) || 0, 0, 100);
  }

  launch() {
    this.auto = false;
    this.brakeInput = 0;
    this.throttleInput = 100;
  }

  resetSpeed() {
    this.auto = false;
    this.speed = 0;
    this.gear = 1;
    this.rpm = 790;
    this.throttle = 0;
    this.brake = 0;
    this.throttleInput = 0;
    this.brakeInput = 0;
    this.update(0.05);
  }

  coast() {
    this.auto = false;
    this.throttleInput = 0;
    this.brakeInput = 0;
  }

  autoDrive(dt) {
    this.phaseTime += dt;
    const phase = AUTO_PHASES[this.phase % AUTO_PHASES.length];
    this.target = phase.target;
    if (this.phaseTime > phase.duration) {
      this.phaseTime = 0;
      this.phase = (this.phase + 1) % AUTO_PHASES.length;
    }
    const err = this.target - this.speed;
    let throttle = clamp(err * 4.5 + 8, 0, 100);
    let brake = 0;
    if (err < -6) {
      brake = clamp(-err * 5, 0, 65);
      throttle = 0;
    }
    if (this.target === 0 && this.speed < 2) {
      throttle = 0;
      brake = 35;
    }
    this.throttleInput = throttle;
    this.brakeInput = brake;
  }

  update(dt) {
    if (this.auto) this.autoDrive(dt);

    // Pedal smoothing
    this.throttle += (this.throttleInput - this.throttle) * clamp(dt * 7, 0, 1);
    this.brake += (this.brakeInput - this.brake) * clamp(dt * 10, 0, 1);

    const t = this.throttle / 100;
    const speedFactor = 1 - clamp(this.speed / 210, 0, 0.85);
    const drive = t * 4.4 * speedFactor;
    const drag = 0.00055 * this.speed * this.speed + 0.22;
    const brakeDecel = (this.brake / 100) * 9.5;
    let accel = drive - drag - brakeDecel;
    if (this.speed <= 0.4 && this.throttle < 3) {
      this.speed = 0;
      accel = 0;
    }
    this.speed = clamp(this.speed + accel * 3.6 * dt, 0, 235);

    // Gearbox
    while (this.gear < 6 && this.speed > GEAR_TOPS[this.gear - 1] * 0.97) this.gear += 1;
    while (this.gear > 1 && this.speed < GEAR_FLOORS[this.gear - 1] * 0.82) this.gear -= 1;
    const floor = GEAR_FLOORS[this.gear - 1];
    const top = GEAR_TOPS[this.gear - 1];
    const band = clamp((this.speed - floor) / Math.max(1, top - floor), 0, 1);
    const targetRpm = this.speed < 1 ? 790 : 900 + band * (5200 - 900) * (0.85 + t * 0.35);
    this.rpm += (clamp(targetRpm, 780, 6800) - this.rpm) * clamp(dt * 8, 0, 1);

    // Temperatures
    const loadHeat = 0.8 + t * 3.2;
    this.coolant += (clamp(88 + t * 6, 80, 104) - this.coolant) * clamp(dt * 0.05, 0, 1);
    this.oil += (clamp(92 + t * 14 + this.speed * 0.04, 80, 128) - this.oil) * clamp(dt * 0.035, 0, 1);
    this.intake += (clamp(this.ambient + 5 + t * 9 + this.speed * 0.015, this.ambient, 62) - this.intake) * clamp(dt * 0.25, 0, 1);

    this.runtime += dt;
    this.odometer += (this.speed * dt) / 3600;
    this.distanceCleared += (this.speed * dt) / 3600;
    if (this.readinessReset && this.odometer - this.readinessResetAt >= 1.5) {
      this.readinessReset = false;
    }
    if (this.dtcs.length) this.distanceMil += (this.speed * dt) / 3600;

    const tank = Number(this.vehicle?.tank) || 55;
    const fuelRate = this.fuelRate();
    this.fuelLevel = clamp(this.fuelLevel - (fuelRate * dt) / 3600 / tank * 100, 0, 100);

    this.battery = this.speed < 1 ? 13.9 : 14.2 - t * 0.25;
    this.values = this.computeValues();
  }

  fuelRate() {
    return clamp(0.55 + (this.throttle / 100) * 10.5 + this.rpm / 2600 + this.speed * 0.012, 0.5, 42);
  }

  computeValues() {
    const t = this.throttle / 100;
    const load = clamp(14 + t * 76 + (this.speed > 1 ? 6 : 0), 0, 100);
    const maf = clamp(2.1 + t * 33 + this.rpm * 0.0018, 1.8, 220);
    const map = clamp(28 + t * 112 + (this.rpm / 6800) * 18, 18, 240);
    const fuelRate = this.fuelRate();
    const timing = 4 + t * 16 - (this.rpm > 4500 ? 4 : 0);
    return {
      rpm: Math.round(this.rpm),
      speed: Math.round(this.speed),
      load: Math.round(load),
      coolant: Math.round(this.coolant),
      intake: Math.round(this.intake),
      ambient: Math.round(this.ambient),
      oilTemp: Math.round(this.oil),
      throttle: Math.round(this.throttle),
      pedal: Math.round(this.throttleInput),
      cmdThrottle: Math.round(clamp(this.throttle + 1.5, 0, 100)),
      maf: Math.round(maf * 10) / 10,
      map: Math.round(map),
      baro: 101,
      timing: Math.round(timing * 10) / 10,
      fuelLevel: Math.round(this.fuelLevel * 10) / 10,
      fuelRate: Math.round(fuelRate * 10) / 10,
      fuelPressure: 348,
      railPressure: Math.round(4200 + t * 9800),
      equivRatio: Math.round((0.98 + t * 0.04 + (Math.random() - 0.5) * 0.02) * 100) / 100,
      voltage: Math.round(this.battery * 100) / 100,
      runtime: Math.round(this.runtime),
      distanceMil: Math.round(this.distanceMil),
      distanceCleared: Math.round(this.distanceCleared),
      catalyst: Math.round(410 + load * 2.1),
      egrCmd: this.throttle < 45 ? 12 : 0,
      egrError: Math.round((Math.random() - 0.5) * 6),
      absLoad: Math.round(load * 2.55),
      torqueActual: Math.round(clamp(t * 95 - 12, -125, 125)),
      torqueRef: 250,
      odometer: Math.round(this.odometer),
    };
  }

  read(key) {
    return this.values[key];
  }

  readAll() {
    return { ...this.values };
  }

  getDtcs() {
    return this.dtcs.map((d) => ({ ...d }));
  }

  getFreezeFrame() {
    const v = this.values;
    return {
      rpm: v.rpm, speed: v.speed, coolant: v.coolant, intake: v.intake, load: v.load,
      throttle: v.throttle, maf: v.maf, fuelLevel: v.fuelLevel, voltage: v.voltage,
      fuelRate: v.fuelRate, capturedAt: Date.now(),
    };
  }

  clearDtcs() {
    const cleared = this.dtcs.length;
    this.dtcs = [];
    this.distanceMil = 0;
    this.readinessReset = true;
    this.readinessResetAt = this.odometer;
    return cleared;
  }

  getReadiness() {
    const mil = this.dtcs.some((d) => d.status === 'stored');
    const incomplete = new Set(mil ? ['evap', 'o2Heater'] : ['evap']);
    return READINESS_MONITORS.filter((m) => m.supports).map((m) => ({
      ...m,
      complete: this.readinessReset ? false : !incomplete.has(m.key),
    }));
  }

  getMode06() {
    return MODE06_DEMO.map((m) => ({ ...m }));
  }

  encodeDtcResponse(prefix, list) {
    const bytes = list.slice(0, 3).map((d) => {
      const code = String(d.code || '').toUpperCase().replace(/[^0-9A-F]/g, '').padEnd(4, '0');
      return [parseInt(code.slice(0, 2), 16), parseInt(code.slice(2, 4), 16)];
    });
    const count = bytes.length;
    while (bytes.length < 3) bytes.push([0, 0]);
    // J1979 response: 43/47/4A + DTC count + up to three DTC pairs (padded with 00 00).
    return [prefix, count, ...bytes.flat()].map((b) => toHex(b)).join(' ');
  }

  query(command) {
    const raw = String(command || '').trim().toUpperCase();
    const cmd = raw.replace(/\s+/g, '');
    if (!cmd) return '';

    if (cmd.startsWith('AT')) {
      if (cmd === 'ATZ' || cmd === 'ATI' || cmd === 'AT@1') return 'ELM327 v1.5';
      if (cmd === 'ATRV') return `${this.values.voltage.toFixed(1)}V`;
      if (cmd === 'ATDP') return 'AUTO, ISO 15765-4 (CAN 11/500)';
      if (cmd === 'ATDPN') return 'A6';
      if (cmd === 'ATSP0' || cmd === 'ATSP6') return 'OK';
      if (cmd === 'ATRV' || cmd === 'ATIGN') return 'ON';
      if (cmd === 'ATD' || cmd === 'ATZ') return 'OK';
      return 'OK';
    }

    if (cmd === '0100') return '41 00 BE 3F A8 13';
    if (cmd === '0120') return '41 20 80 05 A0 01';
    if (cmd === '0140') return '41 40 FE D0 00 00';
    if (cmd === '0160') return '41 60 00 00 00 01';
    if (cmd === '0180') return '41 80 00 00 00 00';

    if (cmd === '03') return this.encodeDtcResponse(0x43, this.dtcs.filter((d) => d.status === 'stored'));
    if (cmd === '07') return this.encodeDtcResponse(0x47, this.dtcs.filter((d) => d.status === 'pending'));
    if (cmd === '0A') return this.encodeDtcResponse(0x4a, this.dtcs.filter((d) => d.status === 'permanent'));
    if (cmd === '04') {
      this.dtcs = [];
      return '44';
    }
    if (cmd === '0902') {
      const vin = String(this.vehicle?.vin || 'WVWZZZAUZMW000001').toUpperCase().padEnd(17, '0').slice(0, 17);
      const bytes = [...vin].map((c) => toHex(c.charCodeAt(0)));
      return `49 02 01 ${bytes.join(' ')}`;
    }
    if (cmd === '0904') return '49 04 01 30 30 30 30';
    if (cmd === '0906') return '49 06 01 01';
    if (cmd === '090A') return '49 0A 01 41 55 54 4F 50 55 4C 53 45';

    const match = cmd.match(/^01([0-9A-F]{2})$/);
    if (match) {
      const id = match[1];
      const pid = Object.values(PIDS_BY_KEY).find((p) => p.pid === id);
      if (!pid) return 'NO DATA';
      const value = this.values[pid.key];
      if (value === undefined) return 'NO DATA';
      const bytes = pid.encode ? pid.encode(value) : [0];
      return `41 ${id} ${bytes.map((b) => toHex(clamp(Math.round(b), 0, 255))).join(' ')}`;
    }

    if (cmd.startsWith('22')) return 'NO DATA';
    return '?';
  }
}
