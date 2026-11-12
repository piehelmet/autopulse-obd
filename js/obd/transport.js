/* AutoPulse OBD2 — Web Serial, Web Bluetooth and native Android BLE transports */

import { isNativeApp, loadNativeBle } from './native-ble.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const BLE_SERVICES = [
  0xffe0,
  0xfff0,
  0x18f0,
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
];
const BLE_OPTIONAL = [
  0xffe0, 0xffe1, 0xffe2, 0xfff0, 0xfff1, 0xfff2, 0x18f0, 0x2af0, 0x2af1,
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
];

export const isSerialSupported = () => 'serial' in navigator;
export const isBluetoothSupported = () => isNativeApp() || 'bluetooth' in navigator;

const bareUuid = (uuid) => {
  if (typeof uuid === 'number') return uuid.toString(16).padStart(4, '0');
  return String(uuid || '').toLowerCase().replace(/[^0-9a-f]/g, '');
};
const toFullUuid = (uuid) => {
  const short = bareUuid(uuid);
  if (short.length === 4) return `0000${short}-0000-1000-8000-00805f9b34fb`;
  if (short.length === 8) return `${short}-0000-1000-8000-00805f9b34fb`;
  if (short.length === 32) return `${short.slice(0, 8)}-${short.slice(8, 12)}-${short.slice(12, 16)}-${short.slice(16, 20)}-${short.slice(20)}`;
  return String(uuid);
};
const isKnownService = (uuid) => {
  const hex = bareUuid(uuid);
  return BLE_SERVICES.some((known) => {
    const short = bareUuid(known);
    return hex === short || (short.length === 4 && hex.includes(short));
  });
};

const pickService = (services) => {
  if (!services?.length) return null;
  return services.find((s) => isKnownService(s.uuid))
    || services.find((s) => /ffe0|fff0/.test(bareUuid(s.uuid)))
    || services[0];
};

class BaseTransport {
  constructor(name = 'Adapter') {
    this.name = name;
    this.buffer = '';
    this.queue = [];
    this.waiters = [];
    this.idleTimer = null;
    this.idleMs = 220;
    this.connected = false;
  }

  push(chunk) {
    if (!chunk) return;
    this.buffer += chunk;
    this.flush();
  }

  flush() {
    let idx;
    while ((idx = this.buffer.indexOf('>')) >= 0) {
      const resp = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      this.deliver(resp);
    }
    if (this.buffer.trim()) {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        const resp = this.buffer;
        this.buffer = '';
        if (resp.trim()) this.deliver(resp);
      }, this.idleMs);
    }
  }

  deliver(resp) {
    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(resp);
    } else {
      this.queue.push(resp);
      if (this.queue.length > 12) this.queue.shift();
    }
  }

  readResponse(timeout = 5000) {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const i = this.waiters.indexOf(waiter);
          if (i >= 0) this.waiters.splice(i, 1);
          reject(new Error('Adapter response timed out'));
        }, timeout),
      };
      this.waiters.push(waiter);
    });
  }

  async disconnect() {
    this.connected = false;
    clearTimeout(this.idleTimer);
    this.waiters.forEach((w) => {
      clearTimeout(w.timer);
      w.reject(new Error('Adapter disconnected'));
    });
    this.waiters = [];
    this.queue = [];
    this.buffer = '';
  }
}

export class SerialTransport extends BaseTransport {
  constructor() {
    super('Serial adapter');
    this.port = null;
    this.reader = null;
    this.reading = false;
  }

  async connect({ baudRate = 38400 } = {}) {
    if (!isSerialSupported()) throw new Error('Web Serial is not supported in this browser. Use Chrome or Edge on desktop.');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
    this.connected = true;
    this.reading = true;
    this.name = 'USB / serial ELM327';
    this.readLoop();
  }

  async readLoop() {
    while (this.reading && this.port?.readable) {
      this.reader = this.port.readable.getReader();
      try {
        while (this.reading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) this.push(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        if (this.reading) console.warn('Serial read error', err);
      } finally {
        try { this.reader.releaseLock(); } catch { /* ignore */ }
        this.reader = null;
      }
      if (!this.reading) break;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  async write(text) {
    if (!this.port?.writable) throw new Error('Serial port is not open');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(encoder.encode(text));
    } finally {
      writer.releaseLock();
    }
  }

  async disconnect() {
    this.reading = false;
    try { await this.reader?.cancel(); } catch { /* ignore */ }
    await super.disconnect();
    try { await this.port?.close(); } catch { /* ignore */ }
    this.port = null;
  }
}

export class BleTransport extends BaseTransport {
  constructor() {
    super('Bluetooth adapter');
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.native = null;
    this.deviceId = null;
    this.serviceUuid = null;
    this.writeUuid = null;
    this.notifyUuid = null;
    this.onChange = (e) => {
      const value = e.target.value;
      if (!value) return;
      this.push(decoder.decode(value, { stream: true }));
    };
  }

  async connect() {
    if (isNativeApp()) return this.connectNative();
    if (!isBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge over HTTPS or localhost.');
    }
    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [0xffe0] },
        { services: [0xfff0] },
        { namePrefix: 'OBD' },
        { namePrefix: 'ELM' },
        { namePrefix: 'Vgate' },
        { namePrefix: 'V-Link' },
        { namePrefix: 'KONNWEI' },
      ],
      optionalServices: BLE_OPTIONAL,
    });
    this.name = this.device.name || 'Bluetooth ELM327';
    this.server = await this.device.gatt.connect();

    let service = null;
    for (const uuid of BLE_SERVICES) {
      try {
        service = await this.server.getPrimaryService(uuid);
        if (service) break;
      } catch { /* try next */ }
    }
    if (!service) {
      const services = await this.server.getPrimaryServices();
      service = services.find((s) => s.uuid.includes('ffe0') || s.uuid.includes('fff0')) || services[0];
    }
    if (!service) throw new Error('No usable GATT service found on this device');

    const chars = await service.getCharacteristics();
    this.notifyChar = chars.find((c) => c.properties.notify || c.properties.indicate) || null;
    this.writeChar = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse) || this.notifyChar;
    if (!this.writeChar) throw new Error('No writable characteristic found');

    if (this.notifyChar) {
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', this.onChange);
    }
    this.connected = true;
  }

  /* Native Android path: talks to the BLE stack through Capacitor, so the app
   * does not need Chrome, Web Bluetooth or an internet connection. */
  async connectNative() {
    const ble = await loadNativeBle();
    this.native = ble;

    try {
      await ble.initialize();
    } catch (err) {
      throw new Error(`Bluetooth could not start: ${err?.message || err}`);
    }
    if (!(await ble.isEnabled())) {
      try { await ble.requestEnable(); } catch { /* user declined */ }
      if (!(await ble.isEnabled())) throw new Error('Bluetooth is turned off. Turn Bluetooth on and try again.');
    }

    let device;
    try {
      device = await ble.requestDevice({ optionalServices: BLE_OPTIONAL.map(toFullUuid) });
    } catch (err) {
      throw new Error(err?.message || 'No Bluetooth adapter was selected');
    }
    this.deviceId = device.deviceId;
    this.name = device.name || device.localName || 'Bluetooth ELM327';

    await ble.connect(this.deviceId, () => {
      if (!this.connected) return;
      this.connected = false;
      this.push('\nNO DATA\n');
    });

    const services = await ble.getServices(this.deviceId);
    const service = pickService(services);
    if (!service) throw new Error('No usable GATT service found on this device');

    const chars = service.characteristics || [];
    const notify = chars.find((c) => c.properties?.notify || c.properties?.indicate) || null;
    const write = chars.find((c) => c.properties?.write || c.properties?.writeWithoutResponse) || notify;
    if (!write) throw new Error('No writable characteristic found');

    this.serviceUuid = service.uuid;
    this.writeUuid = write.uuid;
    this.notifyUuid = notify ? notify.uuid : null;

    if (notify) {
      await ble.startNotifications(this.deviceId, service.uuid, notify.uuid, (value) => {
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        this.push(decoder.decode(bytes, { stream: true }));
      });
    }
    this.connected = true;
  }

  async write(text) {
    if (this.native) {
      if (!this.writeUuid) throw new Error('Bluetooth characteristic is not ready');
      const bytes = encoder.encode(text);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      try {
        await this.native.write(this.deviceId, this.serviceUuid, this.writeUuid, view);
      } catch {
        await this.native.writeWithoutResponse(this.deviceId, this.serviceUuid, this.writeUuid, view);
      }
      return;
    }
    if (!this.writeChar) throw new Error('Bluetooth characteristic is not ready');
    const data = encoder.encode(text);
    try {
      if (this.writeChar.properties.writeWithoutResponse) await this.writeChar.writeValueWithoutResponse(data);
      else await this.writeChar.writeValue(data);
    } catch {
      await this.writeChar.writeValue(data);
    }
  }

  async disconnect() {
    if (this.native) {
      const native = this.native;
      const id = this.deviceId;
      this.native = null;
      this.deviceId = null;
      this.serviceUuid = null;
      this.writeUuid = null;
      this.notifyUuid = null;
      await super.disconnect();
      try { await native.disconnect(id); } catch { /* ignore */ }
      return;
    }
    await super.disconnect();
    try {
      if (this.notifyChar) {
        this.notifyChar.removeEventListener('characteristicvaluechanged', this.onChange);
        await this.notifyChar.stopNotifications();
      }
    } catch { /* ignore */ }
    try { this.device?.gatt?.disconnect(); } catch { /* ignore */ }
    this.writeChar = null;
    this.notifyChar = null;
    this.server = null;
    this.device = null;
  }
}
