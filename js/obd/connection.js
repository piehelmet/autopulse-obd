/* AutoPulse OBD2 — connection manager: demo simulator or real ELM327 adapter */

import { DemoVehicle } from './simulator.js';
import { SerialTransport, BleTransport } from './transport.js';
import { PIDS, PIDS_BY_KEY, CORE_KEYS } from '../data/pids.js';
import { parseHex, sleep, clamp } from '../core/utils.js';
import { demoBytesFor } from '../data/custom.js';
import { resolveModulePreset, scanElmModules } from './enhanced.js';

const cleanResponse = (raw = '') =>
  String(raw)
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

class Elm327 {
  constructor(transport, log) {
    this.transport = transport;
    this.log = log || (() => {});
    this.adapter = 'ELM327';
    this.protocol = 'Auto';
    this.firmware = 'Unknown';
  }

  async command(cmd, timeout = 5000) {
    this.log('tx', cmd);
    await this.transport.write(`${cmd}\r`);
    const raw = await this.transport.readResponse(timeout);
    const text = cleanResponse(raw);
    this.log('rx', text || '(no data)');
    return text;
  }

  async tryCommand(cmd, timeout = 5000) {
    try {
      return await this.command(cmd, timeout);
    } catch {
      return '';
    }
  }

  async init() {
    const z = await this.tryCommand('ATZ', 7000);
    this.firmware = (z.match(/ELM\s?327[^\n]*/i) || ['ELM327'])[0].trim();
    await sleep(120);
    for (const cmd of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATAT1', 'ATSP0']) {
      await this.tryCommand(cmd, 2500);
    }
    const id = await this.tryCommand('ATI', 2500);
    if (id && !/ELM|OBD/i.test(id)) this.adapter = id.split('\n')[0].slice(0, 40);
    else this.adapter = this.firmware || 'ELM327';
    const dp = await this.tryCommand('ATDP', 2500);
    if (dp && !/^OK$/i.test(dp)) this.protocol = dp.split('\n')[0];
    const test = await this.tryCommand('0100', 6000);
    if (!/[0-9A-F]{2}/i.test(test) && !/NO DATA|UNABLE/i.test(test)) {
      throw new Error('Adapter did not answer the OBD-II handshake. Check ignition and connection.');
    }
  }

  /* Module probing changes the header, receive filter, protocol and timeout.
   * ATD restores the adapter defaults; the normal init commands are then
   * re-applied so live polling keeps working. */
  async restoreDefaults() {
    await this.tryCommand('ATD', 3000);
    await sleep(150);
    for (const cmd of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATAT1', 'ATSP0']) {
      await this.tryCommand(cmd, 2000);
    }
  }

  async readPid(pid) {
    const res = await this.command(`${pid.mode}${pid.pid}`, 4000);
    if (/NO DATA|UNABLE|ERROR|STOPPED|\?/i.test(res)) throw new Error('PID not supported');
    const bytes = parseHex(res);
    const isMode22 = pid.mode === '22';
    const header = pid.mode === '01' ? 0x41 : isMode22 ? 0x62 : 0x61;
    const idx = bytes.indexOf(header);
    if (idx < 0) throw new Error('No OBD response');
    let dataStart;
    if (isMode22) {
      const id1 = parseInt(pid.pid.slice(0, 2), 16);
      const id2 = parseInt(pid.pid.slice(2, 4), 16);
      if (bytes[idx + 1] !== id1 || bytes[idx + 2] !== id2) throw new Error('Unexpected PID in response');
      dataStart = idx + 3;
    } else {
      if (bytes[idx + 1] !== parseInt(pid.pid, 16)) throw new Error('Unexpected PID in response');
      dataStart = idx + 2;
    }
    const data = bytes.slice(dataStart, dataStart + (pid.bytes || 1));
    if (data.length < (pid.bytes || 1)) throw new Error('Short OBD response');
    return pid.decode(data);
  }

  async readMode01Pid(pidByte) {
    const res = await this.command(`01${pidByte}`, 4000);
    const bytes = parseHex(res);
    const idx = bytes.indexOf(0x41);
    if (idx < 0) return null;
    return bytes.slice(idx + 2);
  }

  async readDtcs(mode = '03', prefix = 0x43) {
    const res = await this.command(mode, 5000);
    if (/NO DATA|UNABLE|ERROR|\?/i.test(res)) return [];
    const bytes = parseHex(res);
    const idx = bytes.indexOf(prefix);
    if (idx < 0) return [];
    let data = bytes.slice(idx + 1);
    // Remove trailing 00 00 padding pairs without damaging a real DTC that ends in 00.
    while (data.length >= 2 && data[data.length - 1] === 0 && data[data.length - 2] === 0) {
      data = data.slice(0, -2);
    }
    // SAE J1979 prefixes the list with a DTC count byte (43/47/4A NN ...).
    // With the count the payload is odd-length and NN equals the number of pairs;
    // without it the payload is an even-length list of pairs. Matching both makes
    // this safe for adapters that omit the count and for codes that end in 00.
    if (data.length % 2 === 1 && data[0] === (data.length - 1) / 2) {
      data = data.slice(1);
    }
    const out = [];
    for (let i = 0; i + 1 < data.length; i += 2) {
      const b1 = data[i];
      const b2 = data[i + 1];
      if (b1 === 0 && b2 === 0) break;
      const system = ['P', 'C', 'B', 'U'][b1 >> 6] || 'P';
      const num = ((b1 & 0x3f) << 8) | b2;
      const code = `${system}${num.toString(16).toUpperCase().padStart(4, '0')}`;
      out.push({
        code,
        status: mode === '03' ? 'stored' : mode === '07' ? 'pending' : 'permanent',
        ecu: 'ECU',
        freezeFrame: false,
      });
    }
    return out;
  }

  async readReadiness() {
    const data = await this.readMode01Pid('01');
    if (!data || data.length < 4) return null;
    const [a, b, c, d] = data;
    const monitors = [
      { key: 'misfire', name: 'Misfire monitor', type: 'continuous', sup: b & 1, inc: c & 1 },
      { key: 'fuelSystem', name: 'Fuel system monitor', type: 'continuous', sup: b & 2, inc: c & 2 },
      { key: 'components', name: 'Comprehensive components', type: 'continuous', sup: b & 4, inc: c & 4 },
      { key: 'catalyst', name: 'Catalyst monitor', type: 'non-continuous', sup: b & 8, inc: c & 8 },
      { key: 'heatedCatalyst', name: 'Heated catalyst monitor', type: 'non-continuous', sup: b & 16, inc: c & 16 },
      { key: 'evap', name: 'EVAP system monitor', type: 'non-continuous', sup: b & 32, inc: c & 32 },
      { key: 'secondaryAir', name: 'Secondary air system', type: 'non-continuous', sup: b & 64, inc: c & 64 },
      { key: 'acRefrigerant', name: 'A/C refrigerant monitor', type: 'non-continuous', sup: b & 128, inc: c & 128 },
      { key: 'o2Sensor', name: 'O2 sensor monitor', type: 'non-continuous', sup: d & 1, inc: d & 8 },
      { key: 'o2Heater', name: 'O2 sensor heater monitor', type: 'non-continuous', sup: d & 2, inc: d & 16 },
      { key: 'egr', name: 'EGR / VVT system monitor', type: 'non-continuous', sup: d & 4, inc: d & 32 },
    ];
    return {
      mil: Boolean(a & 0x80),
      dtcCount: a & 0x7f,
      monitors: monitors.filter((m) => m.sup).map((m) => ({
        key: m.key, name: m.name, type: m.type, supports: true, complete: !m.inc,
      })),
    };
  }

  async readFreezeFrame() {
    const keys = ['0C', '0D', '05', '0F', '04', '11', '10', '2F', '42', '5E'];
    const out = {};
    for (const id of keys) {
      const pid = Object.values(PIDS_BY_KEY).find((p) => p.pid === id);
      if (!pid) continue;
      try {
        const res = await this.command(`02${id}00`, 3500);
        const bytes = parseHex(res);
        const idx = bytes.indexOf(0x42);
        if (idx < 0) continue;
        const data = bytes.slice(idx + 3, idx + 3 + pid.bytes);
        if (data.length === pid.bytes) out[pid.key] = pid.decode(data);
      } catch { /* skip unsupported frame PID */ }
    }
    out.capturedAt = Date.now();
    return out;
  }
}

export class ObdConnection {
  constructor() {
    this.mode = 'demo';
    this.status = 'disconnected';
    this.values = {};
    this.lastUpdate = 0;
    this.error = '';
    this.sim = null;
    this.elm = null;
    this.transport = null;
    this.pollTimer = null;
    this.pollRate = 250;
    this.pollKeys = [...CORE_KEYS];
    this.extraPids = new Map();
    this.cursor = 0;
    this.busy = false;
    this.paused = false;
    this.info = { adapter: 'Simulated ELM327', firmware: 'v1.5 (demo)', protocol: 'ISO 15765-4 CAN 11/500 (demo)' };
    this.vehicle = null;
    this.handlers = new Map();
    this.lastDtcs = [];
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.handlers.get(event)?.delete(fn);
  }

  emit(event, payload) {
    this.handlers.get(event)?.forEach((fn) => {
      try { fn(payload); } catch (err) { console.warn('AutoPulse handler error', err); }
    });
  }

  log(dir, text) {
    this.emit('log', { dir, text, at: Date.now() });
  }

  setStatus(status, error = '') {
    this.status = status;
    this.error = error;
    this.emit('status', { status, error, mode: this.mode, info: this.info });
  }

  setVehicle(vehicle) {
    this.vehicle = vehicle;
    if (this.sim) this.sim.setVehicle(vehicle);
  }

  setPollRate(ms) {
    this.pollRate = Math.max(80, Number(ms) || 250);
  }

  pausePolling() {
    this.paused = true;
  }

  resumePolling() {
    this.paused = false;
  }

  async waitIdle(timeout = 4000) {
    const start = Date.now();
    while (this.busy && Date.now() - start < timeout) {
      await sleep(60);
    }
  }

  setExtraPids(list = []) {
    this.extraPids = new Map(list.map((p) => [p.key, p]));
  }

  setPollKeys(keys) {
    const valid = keys.filter((k) => PIDS_BY_KEY[k] || this.extraPids.has(k));
    this.pollKeys = valid.length ? valid : [...CORE_KEYS];
    this.cursor = 0;
  }

  async connectDemo(vehicle) {
    await this.disconnect();
    this.mode = 'demo';
    this.vehicle = vehicle;
    this.setStatus('connecting');
    this.info = {
      adapter: 'Simulated ELM327',
      firmware: 'v1.5 (demo)',
      protocol: 'ISO 15765-4 CAN 11/500 (demo)',
    };
    this.sim = new DemoVehicle(vehicle || {});
    this.sim.start();
    this.values = this.sim.readAll();
    this.lastUpdate = Date.now();
    this.setStatus('connected');
    this.emit('data', { ...this.values });
    this.scheduleTick();
  }

  async connectSerial({ baudRate = 38400 } = {}) {
    await this.disconnect();
    this.mode = 'serial';
    this.setStatus('connecting');
    this.transport = new SerialTransport();
    try {
      await this.transport.connect({ baudRate });
      this.elm = new Elm327(this.transport, (dir, text) => this.log(dir, text));
      await this.elm.init();
      this.info = {
        adapter: this.elm.adapter,
        firmware: this.elm.firmware,
        protocol: this.elm.protocol,
      };
      this.setStatus('connected');
      this.scheduleTick();
    } catch (err) {
      this.setStatus('error', err.message || 'Serial connection failed');
      try { await this.transport?.disconnect(); } catch { /* ignore */ }
      this.transport = null;
      throw err;
    }
  }

  async connectBluetooth() {
    await this.disconnect();
    this.mode = 'bluetooth';
    this.setStatus('connecting');
    this.transport = new BleTransport();
    try {
      await this.transport.connect();
      this.elm = new Elm327(this.transport, (dir, text) => this.log(dir, text));
      await this.elm.init();
      this.info = {
        adapter: this.elm.adapter || this.transport.name,
        firmware: this.elm.firmware,
        protocol: this.elm.protocol,
      };
      this.setStatus('connected');
      this.scheduleTick();
    } catch (err) {
      this.setStatus('error', err.message || 'Bluetooth connection failed');
      try { await this.transport?.disconnect(); } catch { /* ignore */ }
      this.transport = null;
      throw err;
    }
  }

  async disconnect() {
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.busy = false;
    this.sim?.stop();
    this.sim = null;
    if (this.transport) {
      try { await this.transport.disconnect(); } catch { /* ignore */ }
      this.transport = null;
    }
    this.elm = null;
    if (this.status !== 'disconnected') this.setStatus('disconnected');
  }

  scheduleTick() {
    clearTimeout(this.pollTimer);
    if (this.status !== 'connected') return;
    this.pollTimer = setTimeout(async () => {
      await this.tick();
      if (this.status === 'connected') this.scheduleTick();
    }, this.pollRate);
  }

  async tick() {
    if (this.paused || this.busy || this.status !== 'connected') return;
    this.busy = true;
    try {
      if (this.mode === 'demo' && this.sim) {
        this.values = this.sim.readAll();
        const demoBytes = demoBytesFor(this.values);
        this.extraPids.forEach((pid, key) => {
          try {
            const raw = pid.decode(demoBytes);
            if (Number.isFinite(raw)) {
              const decimals = pid.decimals ?? 1;
              const factor = 10 ** decimals;
              this.values[key] = Math.round(clamp(raw, pid.min, pid.max) * factor) / factor;
            }
          } catch { /* invalid custom formula */ }
        });
        this.lastUpdate = Date.now();
        this.emit('data', { ...this.values });
      } else if (this.elm) {
        const keys = this.pollKeys;
        const batch = Math.min(3, keys.length);
        for (let i = 0; i < batch; i += 1) {
          const key = keys[this.cursor % keys.length];
          this.cursor += 1;
          const pid = PIDS_BY_KEY[key] || this.extraPids.get(key);
          if (!pid) continue;
          try {
            this.values[key] = await this.elm.readPid(pid);
          } catch {
            /* unsupported or transient — keep last value */
          }
        }
        this.lastUpdate = Date.now();
        this.emit('data', { ...this.values });
      }
    } finally {
      this.busy = false;
    }
  }

  async query(cmd) {
    if (this.mode === 'demo' && this.sim) {
      this.log('tx', cmd);
      await sleep(90);
      const res = this.sim.query(cmd);
      this.log('rx', res || '(no data)');
      return res;
    }
    if (!this.elm) throw new Error('Not connected to an adapter');
    return this.elm.command(cmd, 6000);
  }

  async scanDtcs() {
    if (this.mode === 'demo' && this.sim) {
      await sleep(1100);
      const dtcs = this.sim.getDtcs();
      const readiness = this.sim.getReadiness();
      this.lastDtcs = dtcs;
      return {
        dtcs,
        freezeFrame: this.sim.getFreezeFrame(),
        readiness: { mil: dtcs.some((d) => d.status === 'stored'), dtcCount: dtcs.length, monitors: readiness },
        mode06: this.sim.getMode06(),
        scannedAt: Date.now(),
      };
    }
    if (!this.elm) throw new Error('Not connected');
    const stored = await this.elm.readDtcs('03', 0x43);
    const pending = await this.elm.readDtcs('07', 0x47);
    const permanent = await this.elm.readDtcs('0a', 0x4a);
    const readiness = await this.elm.readReadiness();
    const freezeFrame = stored.length ? await this.elm.readFreezeFrame() : {};
    if (stored.length) stored[0].freezeFrame = true;
    const dtcs = [
      ...stored,
      ...pending.map((d) => ({ ...d, status: 'pending' })),
      ...permanent.map((d) => ({ ...d, status: 'permanent' })),
    ];
    this.lastDtcs = dtcs;
    return {
      dtcs,
      freezeFrame,
      readiness: readiness || { mil: false, dtcCount: 0, monitors: [] },
      mode06: [],
      scannedAt: Date.now(),
    };
  }

  /* Experimental direct module scan. Generic OBD-II only reaches the ECM;
   * this probes the standard 11-bit CAN request/response pairs and asks each
   * module for DTCs over UDS or KWP2000. Read-only. */
  async scanModules() {
    const preset = resolveModulePreset(this.vehicle || {});
    if (this.mode === 'demo' && this.sim) {
      await sleep(1400);
      return {
        modules: this.sim.getModuleScan(preset),
        scannedAt: Date.now(),
        preset: { id: preset.id, label: preset.label },
        experimental: false,
        demo: true,
        adapter: this.info.adapter,
        protocol: this.info.protocol,
      };
    }
    if (!this.elm) throw new Error('Not connected to an adapter');

    this.pausePolling();
    try {
      await this.waitIdle();
      const modules = await scanElmModules(this.elm, preset, {
        log: (dir, text) => this.log(dir, text),
      });
      return {
        modules,
        scannedAt: Date.now(),
        preset: { id: preset.id, label: preset.label },
        experimental: true,
        demo: false,
        adapter: this.info.adapter,
        protocol: this.info.protocol,
      };
    } finally {
      try { await this.elm?.restoreDefaults(); } catch { /* adapter may be gone */ }
      this.resumePolling();
      this.scheduleTick();
    }
  }

  async clearDtcs() {
    if (this.mode === 'demo' && this.sim) {
      const n = this.sim.clearDtcs();
      this.lastDtcs = [];
      await sleep(500);
      return n;
    }
    if (!this.elm) throw new Error('Not connected');
    await this.elm.command('04', 6000);
    this.lastDtcs = [];
    return 0;
  }

  async readFreezeFrame() {
    if (this.mode === 'demo' && this.sim) return this.sim.getFreezeFrame();
    if (!this.elm) return {};
    return this.elm.readFreezeFrame();
  }

  async readReadiness() {
    if (this.mode === 'demo' && this.sim) {
      return { mil: this.sim.dtcs.some((d) => d.status === 'stored'), monitors: this.sim.getReadiness() };
    }
    return (await this.elm?.readReadiness()) || { mil: false, monitors: [] };
  }

  async readMode06() {
    if (this.mode === 'demo' && this.sim) return this.sim.getMode06();
    return [];
  }

  setDemoAuto(on) {
    this.sim?.setAuto(on);
  }

  setDemoThrottle(v) {
    this.sim?.setThrottle(v);
  }

  setDemoBrake(v) {
    this.sim?.setBrake(v);
  }

  demoLaunch() {
    this.sim?.launch();
  }

  demoReset() {
    this.sim?.resetSpeed();
  }

  demoCoast() {
    this.sim?.coast();
  }

  getInfo() {
    return { ...this.info, mode: this.mode, status: this.status, error: this.error };
  }
}

export const connection = new ObdConnection();
