/* AutoPulse OBD2 — experimental manufacturer module scan (UDS / KWP2000 over CAN)
 *
 * Generic OBD-II (Mode 03/07/0A) only reaches the engine control module. TCM,
 * ABS and airbag modules are usually on the same 11-bit CAN bus but need
 * physical addressing and a diagnostic service such as UDS (ISO 14229) or
 * KWP2000 (ISO 14230).
 *
 * This module probes the standard 7E0-7E7 request / 7E8-7EF response pairs,
 * asks each module for its DTCs, and decodes single- and multi-frame ELM327
 * replies. It is deliberately read-only and marked experimental: clone ELM327
 * v1.5 firmware often cannot reassemble multi-frame CAN responses reliably.
 */

const CAN_MODULES = [
  {
    id: 'ecm', name: 'Engine control module', short: 'ECM', dtcModule: 'ECM',
    request: '7E0', response: '7E8',
  },
  {
    id: 'tcm', name: 'Transmission control module', short: 'TCM', dtcModule: 'TCM',
    request: '7E1', response: '7E9',
  },
  {
    id: 'abs', name: 'ABS / stability control', short: 'ABS', dtcModule: 'ABS',
    request: '7E2', response: '7EA',
  },
  {
    id: 'srs', name: 'Airbag / occupant restraint', short: 'SRS', dtcModule: 'SRS',
    request: '7E3', response: '7EB',
  },
];

const cloneModules = (overrides = {}) =>
  CAN_MODULES.map((module) => ({ ...module, ...(overrides[module.id] || {}) }));

export const MODULE_PRESETS = {
  'toyota-camry-2011': {
    id: 'toyota-camry-2011',
    label: 'Toyota Camry 2.5 (2011) · 2AR-FE / U760E',
    make: 'Toyota',
    model: 'Camry',
    year: 2011,
    modules: cloneModules({
      ecm: { name: 'Engine ECM (2AR-FE)' },
      tcm: { name: 'Transmission TCM (U760E)' },
      abs: { name: 'ABS / VSC / TRAC' },
      srs: { name: 'Airbag / SRS' },
    }),
  },
  'dodge-caravan-2008': {
    id: 'dodge-caravan-2008',
    label: 'Dodge Grand Caravan 4.0 (2008) · 62TE',
    make: 'Dodge',
    model: 'Grand Caravan',
    year: 2008,
    modules: cloneModules({
      ecm: { name: 'Powertrain control module (PCM)' },
      tcm: { name: 'Transmission control module (62TE)' },
      abs: { name: 'ABS / ESP' },
      srs: { name: 'Occupant restraint controller (ORC)' },
    }),
  },
};

export const resolveModulePreset = (vehicle = {}) => {
  const explicit = vehicle?.modulePreset && MODULE_PRESETS[vehicle.modulePreset];
  if (explicit) return explicit;
  const make = String(vehicle?.make || '').toLowerCase();
  const model = String(vehicle?.model || '').toLowerCase();
  if (make.includes('toyota') && model.includes('camry')) return MODULE_PRESETS['toyota-camry-2011'];
  if ((make.includes('dodge') || make.includes('chrysler')) && model.includes('caravan')) {
    return MODULE_PRESETS['dodge-caravan-2008'];
  }
  return {
    id: 'generic',
    label: 'Generic 11-bit CAN module map',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || null,
    modules: cloneModules(),
  };
};

const STATUS_LINES = /^(NO DATA|UNABLE|STOPPED|ERROR|SEARCHING|BUS INIT|CAN ERROR|BUFFER FULL|\?)/i;

const cleanLines = (text = '') =>
  String(text)
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/* Parse ELM327 output into indexed frames. Handles the optional length line
 * (for example 014), the 0:/1: payload prefixes used with headers off, and
 * adapters that still print an 11-bit header despite ATH0. */
export const parseElmFrames = (text = '') => {
  const frames = [];
  for (const line of cleanLines(text)) {
    if (STATUS_LINES.test(line)) continue;
    if (/^[\d.]+V$/i.test(line)) continue;
    const prefixed = line.match(/^([0-9A-F]):(.*)$/i);
    const body = prefixed ? prefixed[2] : line;
    const hex = body.replace(/[^0-9A-Fa-f]/g, '');
    if (!hex || hex.length % 2 !== 0) continue;
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    if (!bytes.length) continue;
    frames.push({ index: prefixed ? parseInt(prefixed[1], 16) : frames.length, bytes });
  }
  frames.sort((a, b) => a.index - b.index);
  return frames;
};

/* Reassemble ISO-TP single/first/consecutive frames when the adapter leaves
 * the PCI bytes in place. Plain payloads (the normal ELM327 CAF1 behaviour)
 * are returned unchanged. */
export const reassembleFrames = (frames = []) => {
  if (!frames.length) return [];
  const first = frames[0].bytes;
  const type = first[0] >> 4;

  if (type === 0x1 && first.length >= 2) {
    const length = ((first[0] & 0x0f) << 8) | first[1];
    const out = first.slice(2);
    for (let i = 1; i < frames.length && out.length < length; i += 1) {
      const bytes = frames[i].bytes;
      if ((bytes[0] >> 4) === 0x2) out.push(...bytes.slice(1));
      else out.push(...bytes);
    }
    return out.slice(0, length);
  }

  if (type === 0x2) {
    const out = [];
    for (const frame of frames) {
      const bytes = frame.bytes;
      if ((bytes[0] >> 4) === 0x2) out.push(...bytes.slice(1));
      else out.push(...bytes);
    }
    return out;
  }

  if (type === 0x0 && first.length > 1) {
    const length = first[0] & 0x0f;
    if (length > 0 && length <= first.length - 1) return first.slice(1, 1 + length);
  }

  return frames.flatMap((frame) => frame.bytes);
};

const findPair = (bytes, a, b) => {
  for (let i = 0; i + 1 < bytes.length; i += 1) {
    if (bytes[i] === a && bytes[i + 1] === b) return i;
  }
  return -1;
};

const NRC_TEXT = {
  0x10: 'general reject',
  0x11: 'service not supported',
  0x12: 'sub-function not supported',
  0x13: 'incorrect message length',
  0x21: 'busy, repeat request',
  0x22: 'conditions not correct',
  0x31: 'request out of range',
  0x72: 'general programming failure',
  0x78: 'response pending',
  0x7e: 'sub-function not supported in active session',
  0x7f: 'service not supported in active session',
};

export const findNegativeResponse = (bytes = [], service) => {
  for (let i = 0; i < Math.min(bytes.length - 1, 3); i += 1) {
    if (bytes[i] === 0x7f && bytes[i + 1] === service) {
      const nrc = bytes[i + 2];
      return { nrc, text: NRC_TEXT[nrc] || 'request rejected' };
    }
  }
  return null;
};

export const statusFromMask = (mask) => {
  if (mask & 0x08) return 'stored'; // confirmedDTC
  if (mask & 0x04) return 'pending'; // pendingDTC
  if (mask & 0x01) return 'pending'; // testFailed but not confirmed yet
  return 'inactive';
};

const dtcFromBytes = (b1, b2) => {
  const system = ['P', 'C', 'B', 'U'][b1 >> 6] || 'P';
  const number = ((b1 & 0x3f) << 8) | b2;
  return `${system}${number.toString(16).toUpperCase().padStart(4, '0')}`;
};

const hexByte = (value) => Number(value || 0).toString(16).toUpperCase().padStart(2, '0');

/* UDS 19 02 response:
 *   59 02 <availabilityMask> [DTC high, DTC mid, failureType, status]...
 * The first two DTC bytes form the familiar P/C/B/U code; the third byte is
 * the UDS failure type. */
export const decodeUdsDtcResponse = (bytes = []) => {
  const idx = findPair(bytes, 0x59, 0x02);
  if (idx < 0) return null;
  const availability = bytes[idx + 2] ?? 0;
  const data = bytes.slice(idx + 3);
  const dtcs = [];
  for (let i = 0; i + 3 < data.length; i += 4) {
    const b1 = data[i];
    const b2 = data[i + 1];
    const failureType = data[i + 2];
    const statusByte = data[i + 3];
    if (!b1 && !b2 && !failureType) continue;
    const code = dtcFromBytes(b1, b2);
    dtcs.push({
      code,
      failureType,
      udsCode: `${code}-${hexByte(failureType)}`,
      statusByte,
      status: statusFromMask(statusByte),
    });
  }
  return { protocol: 'uds', availability, dtcs };
};

/* KWP2000 18 02 response:
 *   58 02 <count> [DTC high, DTC low, status]... */
export const decodeKwpDtcResponse = (bytes = []) => {
  const idx = findPair(bytes, 0x58, 0x02);
  if (idx < 0) return null;
  const count = bytes[idx + 2] ?? 0;
  const data = bytes.slice(idx + 3);
  const dtcs = [];
  for (let i = 0; i + 2 < data.length; i += 3) {
    const b1 = data[i];
    const b2 = data[i + 1];
    const statusByte = data[i + 2];
    if (!b1 && !b2) continue;
    dtcs.push({
      code: dtcFromBytes(b1, b2),
      statusByte,
      status: statusFromMask(statusByte),
    });
  }
  return { protocol: 'kwp', count, dtcs };
};

/* Fallback for modules that still answer generic Mode 03 even when UDS/KWP
 * service 19/18 is not supported. */
export const decodeObdDtcResponse = (bytes = []) => {
  const idx = bytes.indexOf(0x43);
  if (idx < 0) return null;
  let data = bytes.slice(idx + 1);
  while (data.length >= 2 && data[data.length - 1] === 0 && data[data.length - 2] === 0) {
    data = data.slice(0, -2);
  }
  if (data.length % 2 === 1 && data[0] === (data.length - 1) / 2) data = data.slice(1);
  const dtcs = [];
  for (let i = 0; i + 1 < data.length; i += 2) {
    const b1 = data[i];
    const b2 = data[i + 1];
    if (!b1 && !b2) break;
    dtcs.push({
      code: dtcFromBytes(b1, b2),
      status: 'stored',
      statusByte: 0x08,
    });
  }
  return { protocol: 'obd', dtcs };
};

const ATTEMPTS = [
  { protocol: 'uds', cmd: '19 02 FF', service: 0x19, decode: decodeUdsDtcResponse },
  { protocol: 'kwp', cmd: '18 02 FF', service: 0x18, decode: decodeKwpDtcResponse },
  { protocol: 'obd', cmd: '03', service: 0x03, decode: decodeObdDtcResponse },
];

export const probeModule = async (elm, module, log = () => {}) => {
  const base = {
    ...module,
    present: false,
    supported: false,
    protocol: null,
    dtcs: [],
    note: '',
  };
  const notes = [];

  try {
    await elm.tryCommand(`ATSH ${module.request}`, 2000);
    await elm.tryCommand(`ATCRA ${module.response}`, 2000);
  } catch { /* filter commands are optional on some clones */ }

  for (const attempt of ATTEMPTS) {
    log('tx', `[${module.short}] ${attempt.cmd}`);
    let text = '';
    try {
      text = await elm.command(attempt.cmd, 3500);
    } catch {
      continue;
    }
    const bytes = reassembleFrames(parseElmFrames(text));
    if (!bytes.length) continue;

    const negative = findNegativeResponse(bytes, attempt.service);
    if (negative) {
      base.present = true;
      notes.push(`${attempt.protocol.toUpperCase()} ${negative.text} (NRC 0x${hexByte(negative.nrc)})`);
      continue;
    }

    const decoded = attempt.decode(bytes);
    if (decoded) {
      return {
        ...base,
        present: true,
        supported: true,
        protocol: attempt.protocol,
        dtcs: decoded.dtcs.map((dtc) => ({
          ...dtc,
          module: module.dtcModule,
          ecu: module.short,
        })),
        availability: decoded.availability ?? null,
        note: notes.join(' · '),
      };
    }

    // The module answered, but not with a shape we understand. Treat that as
    // present so the UI can say "responded, service unsupported" rather than
    // pretending the address is empty.
    base.present = true;
    notes.push(`${attempt.protocol.toUpperCase()} responded with an unrecognised payload`);
  }

  return {
    ...base,
    note: notes.join(' · ') || 'No response on this address',
  };
};

export const scanElmModules = async (elm, preset, { log = () => {} } = {}) => {
  const modules = preset?.modules?.length ? preset.modules : resolveModulePreset({}).modules;

  // 11-bit 500 kbps CAN, auto formatting/flow control, a slightly longer
  // timeout for slow modules, then physical addressing per module.
  await elm.tryCommand('ATSP 6', 2500);
  await elm.tryCommand('ATCAF1', 2000);
  await elm.tryCommand('ATCFC1', 2000);
  await elm.tryCommand('ATST 64', 2000);
  await elm.tryCommand('ATAT1', 2000);

  const results = [];
  for (const module of modules) {
    results.push(await probeModule(elm, module, log));
  }

  try { await elm.tryCommand('ATAR', 2000); } catch { /* ignore */ }
  return results;
};
