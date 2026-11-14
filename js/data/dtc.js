/* AutoPulse OBD2 — diagnostic trouble code database */

const d = (code, description, system, severity, causes, symptoms) => ({
  code, description, system, severity, causes, symptoms,
});

export const DTC_DATABASE = [
  d('P0010', 'Camshaft position actuator circuit (Bank 1)', 'Powertrain', 'medium',
    ['Faulty oil control valve', 'Open or shorted actuator circuit', 'Sludge blocking oil passages'],
    ['Rough idle', 'Reduced fuel economy', 'Check engine light']),
  d('P0011', 'Camshaft position timing over-advanced (Bank 1)', 'Powertrain', 'medium',
    ['Stuck oil control valve', 'Incorrect timing chain installation', 'Low engine oil pressure'],
    ['Poor acceleration', 'Rough idle', 'MIL on']),
  d('P0016', 'Crankshaft / camshaft position correlation (Bank 1)', 'Powertrain', 'high',
    ['Stretched timing chain', 'Skipped timing tooth', 'Faulty camshaft sensor'],
    ['Hard starting', 'Misfire', 'Loss of power']),
  d('P0030', 'HO2S heater control circuit (Bank 1, Sensor 1)', 'Powertrain', 'medium',
    ['Failed oxygen sensor heater', 'Blown fuse', 'Wiring fault'],
    ['MIL on', 'Higher emissions']),
  d('P0087', 'Fuel rail / system pressure too low', 'Powertrain', 'high',
    ['Weak high-pressure fuel pump', 'Clogged fuel filter', 'Fuel pressure sensor fault'],
    ['Extended crank', 'Power loss under load', 'Stalling']),
  d('P0088', 'Fuel rail / system pressure too high', 'Powertrain', 'high',
    ['Stuck fuel pressure regulator', 'Restricted return line', 'Sensor fault'],
    ['Rough running', 'Fuel smell', 'MIL on']),
  d('P0100', 'Mass air flow circuit malfunction', 'Powertrain', 'medium',
    ['Faulty MAF sensor', 'Wiring open/short', 'Dirty sensor element'],
    ['Poor drivability', 'Black smoke', 'MIL on']),
  d('P0101', 'Mass air flow circuit range / performance', 'Powertrain', 'medium',
    ['Dirty MAF sensor', 'Vacuum leak', 'Air filter restriction'],
    ['Hesitation', 'Reduced fuel economy', 'MIL on']),
  d('P0102', 'Mass air flow circuit low input', 'Powertrain', 'medium',
    ['Unmetered air leak', 'Faulty MAF', 'Wiring short to ground'],
    ['Lean condition', 'Rough idle']),
  d('P0103', 'Mass air flow circuit high input', 'Powertrain', 'medium',
    ['MAF sensor fault', 'Wiring short to power', 'PCM fault'],
    ['Rich condition', 'Poor fuel economy']),
  d('P0113', 'Intake air temperature circuit high input', 'Powertrain', 'low',
    ['Faulty IAT sensor', 'Open circuit', 'Corroded connector'],
    ['Hard cold start', 'MIL on']),
  d('P0117', 'Engine coolant temperature circuit low input', 'Powertrain', 'medium',
    ['Faulty ECT sensor', 'Short to ground', 'Wiring fault'],
    ['Hard start', 'Cooling fan runs constantly']),
  d('P0118', 'Engine coolant temperature circuit high input', 'Powertrain', 'medium',
    ['Faulty ECT sensor', 'Open circuit', 'Low coolant'],
    ['Overheating indication', 'Poor fuel economy']),
  d('P0120', 'Throttle position sensor A circuit', 'Powertrain', 'high',
    ['Faulty TP sensor', 'Wiring fault', 'Dirty throttle body'],
    ['Reduced power', 'Limp mode', 'Unstable idle']),
  d('P0121', 'Throttle position sensor A range / performance', 'Powertrain', 'medium',
    ['Carbon buildup', 'Sensor wear', 'Connector corrosion'],
    ['Hesitation', 'Limp mode']),
  d('P0130', 'O2 sensor circuit (Bank 1, Sensor 1)', 'Powertrain', 'medium',
    ['Failed upstream O2 sensor', 'Wiring fault', 'Exhaust leak'],
    ['Rough idle', 'Poor economy', 'MIL on']),
  d('P0133', 'O2 sensor slow response (Bank 1, Sensor 1)', 'Powertrain', 'low',
    ['Aging oxygen sensor', 'Contaminated sensor', 'Exhaust leak'],
    ['MIL on', 'Emissions failure']),
  d('P0135', 'O2 sensor heater circuit (Bank 1, Sensor 1)', 'Powertrain', 'medium',
    ['Failed heater element', 'Blown fuse', 'Open circuit'],
    ['MIL on', 'Delayed closed-loop operation']),
  d('P0141', 'O2 sensor heater circuit (Bank 1, Sensor 2)', 'Powertrain', 'low',
    ['Failed downstream sensor heater', 'Fuse', 'Wiring'],
    ['MIL on']),
  d('P0171', 'System too lean (Bank 1)', 'Powertrain', 'high',
    ['Vacuum / intake leak', 'Weak fuel pump', 'Dirty MAF', 'Leaking intake gasket'],
    ['Rough idle', 'Hesitation', 'MIL on']),
  d('P0172', 'System too rich (Bank 1)', 'Powertrain', 'high',
    ['Leaking injector', 'High fuel pressure', 'Faulty MAF', 'Stuck thermostat'],
    ['Black smoke', 'Fuel smell', 'Poor economy']),
  d('P0201', 'Injector circuit — cylinder 1', 'Powertrain', 'high',
    ['Faulty injector', 'Wiring fault', 'PCM driver fault'],
    ['Misfire', 'Rough idle', 'Fuel smell']),
  d('P0234', 'Turbocharger / supercharger overboost', 'Powertrain', 'high',
    ['Stuck wastegate', 'Faulty boost control solenoid', 'Sensor fault'],
    ['Power loss', 'Limp mode', 'MIL on']),
  d('P0299', 'Turbocharger / supercharger underboost', 'Powertrain', 'high',
    ['Boost leak', 'Failed diverter valve', 'Stuck wastegate', 'Faulty sensor'],
    ['Low power', 'Whistling noise', 'Limp mode']),
  d('P0300', 'Random / multiple cylinder misfire detected', 'Powertrain', 'high',
    ['Worn spark plugs', 'Ignition coil failure', 'Vacuum leak', 'Low fuel pressure'],
    ['Rough idle', 'Shaking', 'Flashing MIL']),
  d('P0301', 'Cylinder 1 misfire detected', 'Powertrain', 'high',
    ['Faulty spark plug or coil', 'Injector fault', 'Compression loss'],
    ['Rough idle', 'Shaking', 'Flashing MIL']),
  d('P0302', 'Cylinder 2 misfire detected', 'Powertrain', 'high',
    ['Faulty spark plug or coil', 'Injector fault', 'Compression loss'],
    ['Rough idle', 'Shaking', 'Flashing MIL']),
  d('P0303', 'Cylinder 3 misfire detected', 'Powertrain', 'high',
    ['Faulty spark plug or coil', 'Injector fault', 'Compression loss'],
    ['Rough idle', 'Shaking', 'Flashing MIL']),
  d('P0304', 'Cylinder 4 misfire detected', 'Powertrain', 'high',
    ['Faulty spark plug or coil', 'Injector fault', 'Compression loss'],
    ['Rough idle', 'Shaking', 'Flashing MIL']),
  d('P0325', 'Knock sensor 1 circuit malfunction', 'Powertrain', 'medium',
    ['Faulty knock sensor', 'Wiring fault', 'Loose sensor'],
    ['Reduced power', 'Pinging under load']),
  d('P0335', 'Crankshaft position sensor A circuit', 'Powertrain', 'high',
    ['Faulty CKP sensor', 'Wiring fault', 'Damaged reluctor wheel'],
    ['No start', 'Stalling', 'Misfire']),
  d('P0340', 'Camshaft position sensor A circuit', 'Powertrain', 'high',
    ['Faulty CMP sensor', 'Wiring fault', 'Timing issue'],
    ['Hard start', 'Stall', 'MIL on']),
  d('P0400', 'Exhaust gas recirculation flow malfunction', 'Powertrain', 'medium',
    ['Clogged EGR passages', 'Stuck EGR valve', 'Faulty differential pressure sensor'],
    ['Rough idle', 'Pinging', 'MIL on']),
  d('P0401', 'Exhaust gas recirculation flow insufficient', 'Powertrain', 'medium',
    ['Carbon blockage', 'Failed EGR valve', 'Leaking gasket'],
    ['MIL on', 'Increased NOx']),
  d('P0402', 'Exhaust gas recirculation flow excessive', 'Powertrain', 'medium',
    ['EGR valve stuck open', 'Faulty sensor', 'Wiring'],
    ['Rough idle', 'Stalling', 'Black smoke']),
  d('P0420', 'Catalyst system efficiency below threshold (Bank 1)', 'Powertrain', 'medium',
    ['Aging catalytic converter', 'Failed O2 sensor', 'Exhaust leak', 'Misfire damage'],
    ['MIL on', 'Emissions failure', 'Rotten egg smell']),
  d('P0430', 'Catalyst system efficiency below threshold (Bank 2)', 'Powertrain', 'medium',
    ['Aging catalytic converter', 'Failed O2 sensor', 'Exhaust leak'],
    ['MIL on', 'Emissions failure']),
  d('P0442', 'EVAP system small leak detected', 'Powertrain', 'low',
    ['Loose fuel cap', 'Cracked EVAP hose', 'Faulty purge valve'],
    ['MIL on', 'Fuel smell']),
  d('P0443', 'EVAP purge control valve circuit', 'Powertrain', 'low',
    ['Faulty purge valve', 'Wiring fault', 'PCM fault'],
    ['MIL on', 'Fuel smell']),
  d('P0455', 'EVAP system large leak detected', 'Powertrain', 'medium',
    ['Missing fuel cap', 'Disconnected hose', 'Leaking canister'],
    ['MIL on', 'Strong fuel smell']),
  d('P0456', 'EVAP system very small leak detected', 'Powertrain', 'low',
    ['Fuel cap seal', 'Small hose crack', 'Canister purge valve'],
    ['MIL on']),
  d('P0463', 'Fuel level sensor A circuit high input', 'Powertrain', 'low',
    ['Faulty fuel level sender', 'Wiring fault', 'Instrument cluster fault'],
    ['Incorrect fuel gauge', 'MIL on']),
  d('P0500', 'Vehicle speed sensor malfunction', 'Powertrain', 'medium',
    ['Faulty VSS', 'Wiring fault', 'ABS module fault'],
    ['Speedometer inoperative', 'Shift issues', 'MIL on']),
  d('P0505', 'Idle control system malfunction', 'Powertrain', 'medium',
    ['Carbon buildup in throttle body', 'Faulty IAC valve', 'Vacuum leak'],
    ['Hunting idle', 'Stalling']),
  d('P0507', 'Idle control system RPM higher than expected', 'Powertrain', 'low',
    ['Vacuum leak', 'Throttle body contamination', 'IAC valve fault'],
    ['High idle']),
  d('P0521', 'Engine oil pressure sensor range / performance', 'Powertrain', 'medium',
    ['Faulty oil pressure sensor', 'Low oil level', 'Wiring fault'],
    ['Oil pressure warning', 'MIL on']),
  d('P0524', 'Engine oil pressure too low', 'Powertrain', 'high',
    ['Low oil level', 'Worn oil pump', 'Blocked pickup'],
    ['Oil pressure warning', 'Engine noise']),
  d('P0562', 'System voltage low', 'Powertrain', 'medium',
    ['Weak battery', 'Failing alternator', 'Corroded terminals'],
    ['Dim lights', 'Hard start', 'Electrical faults']),
  d('P0563', 'System voltage high', 'Powertrain', 'medium',
    ['Voltage regulator fault', 'Faulty alternator', 'Battery issue'],
    ['Bulb failures', 'Electrical faults']),
  d('P0600', 'Serial communication link malfunction', 'Powertrain', 'high',
    ['CAN bus wiring fault', 'Module failure', 'Poor ground'],
    ['Multiple warnings', 'No start']),
  d('P0601', 'Internal control module memory checksum error', 'Powertrain', 'high',
    ['PCM failure', 'Corrupted calibration', 'Voltage spike'],
    ['No start', 'Limp mode']),
  d('P0606', 'PCM / ECM processor fault', 'Powertrain', 'high',
    ['Internal PCM failure', 'Power supply issue', 'Ground fault'],
    ['No start', 'Limp mode', 'Multiple warnings']),
  d('P0700', 'Transmission control system (MIL request)', 'Transmission', 'medium',
    ['Stored TCM code', 'Transmission fault', 'Wiring issue'],
    ['MIL on', 'Harsh shifts']),
  d('P0705', 'Transmission range sensor circuit', 'Transmission', 'medium',
    ['Faulty range sensor', 'Wiring fault', 'Shifter adjustment'],
    ['No start in park', 'Incorrect gear display']),
  d('P0715', 'Input / turbine speed sensor circuit', 'Transmission', 'medium',
    ['Faulty sensor', 'Wiring fault', 'Debris on sensor'],
    ['Harsh shifting', 'Limp mode']),
  d('P0730', 'Incorrect gear ratio', 'Transmission', 'high',
    ['Low fluid', 'Internal transmission wear', 'Solenoid fault'],
    ['Slipping', 'Harsh shifts', 'Limp mode']),
  d('P0740', 'Torque converter clutch circuit', 'Transmission', 'medium',
    ['Faulty solenoid', 'Wiring fault', 'Low fluid'],
    ['Shudder', 'Poor economy']),
  d('P2002', 'Diesel particulate filter efficiency below threshold (Bank 1)', 'Powertrain', 'medium',
    ['DPF loading', 'Faulty pressure sensor', 'Short trips preventing regeneration'],
    ['Reduced power', 'MIL on', 'DPF warning']),
  d('P2004', 'Intake manifold runner control stuck open (Bank 1)', 'Powertrain', 'low',
    ['Carbon buildup', 'Faulty actuator', 'Vacuum leak'],
    ['Poor low-end torque', 'MIL on']),
  d('P2015', 'Intake manifold runner position sensor range / performance', 'Powertrain', 'low',
    ['Faulty sensor', 'Sticking flap', 'Wiring'],
    ['MIL on', 'Reduced power']),
  d('P20EE', 'SCR NOx catalyst efficiency below threshold (Bank 1)', 'Powertrain', 'medium',
    ['DEF quality', 'Faulty NOx sensor', 'SCR catalyst degradation'],
    ['MIL on', 'Reduced power', 'DEF warning']),
  d('P2101', 'Throttle actuator control motor circuit range / performance', 'Powertrain', 'high',
    ['Carbon buildup', 'Faulty throttle body', 'Wiring fault'],
    ['Limp mode', 'Reduced power']),
  d('P2119', 'Throttle actuator control throttle body range / performance', 'Powertrain', 'high',
    ['Sticking throttle plate', 'Motor fault', 'Adaptation lost'],
    ['Limp mode', 'Unstable idle']),
  d('P2122', 'Accelerator pedal position sensor D circuit low', 'Powertrain', 'high',
    ['Faulty pedal sensor', 'Wiring fault', 'Connector corrosion'],
    ['Limp mode', 'No throttle response']),
  d('P2135', 'Throttle / pedal position sensor A/B correlation', 'Powertrain', 'high',
    ['Sensor mismatch', 'Wiring fault', 'Throttle body fault'],
    ['Limp mode', 'Reduced power']),
  d('P2187', 'System too lean at idle (Bank 1)', 'Powertrain', 'medium',
    ['Vacuum leak', 'PCV fault', 'Dirty MAF'],
    ['Rough idle', 'Hesitation']),
  d('P2188', 'System too rich at idle (Bank 1)', 'Powertrain', 'medium',
    ['Leaking injector', 'EVAP purge stuck open', 'High fuel pressure'],
    ['Rough idle', 'Fuel smell']),
  d('P2279', 'Intake air system leak', 'Powertrain', 'medium',
    ['Cracked intake hose', 'Failed gasket', 'Loose clamp'],
    ['Whistling', 'Rough idle', 'Lean code']),
  d('P2453', 'Diesel particulate filter pressure sensor A circuit', 'Powertrain', 'medium',
    ['Faulty sensor', 'Blocked hose', 'Wiring'],
    ['DPF warning', 'Reduced power']),
  d('P2463', 'Diesel particulate filter soot accumulation', 'Powertrain', 'high',
    ['Frequent short trips', 'Failed regeneration', 'Faulty sensor'],
    ['Limp mode', 'DPF warning', 'Reduced power']),
  d('P2A00', 'O2 sensor circuit range / performance (Bank 1, Sensor 1)', 'Powertrain', 'medium',
    ['Aging sensor', 'Exhaust leak', 'Wiring fault'],
    ['MIL on', 'Poor economy']),
  d('U0100', 'Lost communication with ECM / PCM', 'Network', 'high',
    ['CAN bus fault', 'ECM power/ground', 'Module failure'],
    ['No start', 'Multiple warnings']),
  d('U0101', 'Lost communication with TCM', 'Network', 'high',
    ['CAN bus fault', 'TCM power/ground', 'Module failure'],
    ['Limp mode', 'No shift']),
  d('U0121', 'Lost communication with ABS control module', 'Network', 'high',
    ['CAN bus fault', 'ABS module power/ground', 'Module failure'],
    ['ABS/ESC warning', 'Multiple warnings']),
  d('U0140', 'Lost communication with body control module', 'Network', 'medium',
    ['CAN bus fault', 'BCM power/ground', 'Module failure'],
    ['Electrical accessories inoperative']),
  d('U0155', 'Lost communication with instrument panel cluster', 'Network', 'medium',
    ['CAN bus fault', 'Cluster power/ground', 'Module failure'],
    ['Dead instrument cluster']),
  d('U0401', 'Invalid data received from ECM / PCM', 'Network', 'medium',
    ['Software mismatch', 'CAN fault', 'Module fault'],
    ['Multiple warnings', 'Limp mode']),
  d('B0001', 'Driver frontal stage 1 deployment control', 'Body', 'high',
    ['Airbag circuit fault', 'Clock spring', 'Crash data stored'],
    ['Airbag warning light']),
  d('B0020', 'Side airbag deployment control', 'Body', 'high',
    ['Side airbag circuit', 'Connector fault', 'Crash data stored'],
    ['Airbag warning light']),
  d('B1000', 'ECU malfunction', 'Body', 'high',
    ['Internal module fault', 'Power supply', 'Ground fault'],
    ['Multiple body functions inoperative']),
  d('B1318', 'Battery voltage low', 'Body', 'medium',
    ['Weak battery', 'Charging fault', 'Parasitic drain'],
    ['Electrical warnings', 'Hard start']),
  d('B1325', 'Control module power circuit', 'Body', 'medium',
    ['Blown fuse', 'Wiring fault', 'Poor ground'],
    ['Module inoperative']),
  d('C0035', 'Left front wheel speed sensor circuit', 'Chassis', 'medium',
    ['Faulty sensor', 'Damaged tone ring', 'Wiring fault'],
    ['ABS warning', 'Traction control disabled']),
  d('C0040', 'Right front wheel speed sensor circuit', 'Chassis', 'medium',
    ['Faulty sensor', 'Damaged tone ring', 'Wiring fault'],
    ['ABS warning', 'Traction control disabled']),
  d('C0050', 'Right rear wheel speed sensor circuit', 'Chassis', 'medium',
    ['Faulty sensor', 'Damaged tone ring', 'Wiring fault'],
    ['ABS warning', 'Traction control disabled']),
  d('C0110', 'Pump motor circuit', 'Chassis', 'high',
    ['ABS pump motor fault', 'Relay failure', 'Wiring'],
    ['ABS inoperative', 'Warning light']),
  d('C0561', 'System disabled information stored', 'Chassis', 'medium',
    ['Related ABS/ESC fault', 'Low voltage', 'Wheel speed fault'],
    ['ESC disabled']),
  d('C1200', 'ABS operation', 'Chassis', 'low',
    ['Wheel slip detected', 'Aggressive braking', 'Low traction'],
    ['ABS warning during event']),
];

export const DTC_MAP = Object.fromEntries(DTC_DATABASE.map((x) => [x.code, x]));

/* Built-in library version. Bump when DTC_DATABASE changes, and publish a
 * matching data/dtc-pack.json so installed apps can pull newer descriptions
 * without waiting for a full app update. */
export const DTC_LIBRARY_VERSION = '2026.11.2';

const PACK_KEY = 'autopulse.dtcPack.v1';
const CODE_RE = /^[PCBU][0-9A-F]{4}$/;

export const SYSTEM_NAMES = {
  P: 'Powertrain',
  C: 'Chassis',
  B: 'Body',
  U: 'Network',
};

export const dtcSystem = (code = '') => SYSTEM_NAMES[code.charAt(0).toUpperCase()] || 'Unknown';

const normalizeCode = (entry) => {
  const code = String(entry?.code || '').toUpperCase().trim();
  const norm = {
    code,
    description: String(entry?.description || 'No description available'),
    system: String(entry?.system || dtcSystem(code)),
    severity: ['low', 'medium', 'high'].includes(entry?.severity) ? entry.severity : 'medium',
    causes: Array.isArray(entry?.causes) && entry.causes.length ? entry.causes.map(String) : ['Component fault', 'Wiring or connector issue', 'Control module fault'],
    symptoms: Array.isArray(entry?.symptoms) && entry.symptoms.length ? entry.symptoms.map(String) : ['Check engine light', 'Reduced performance'],
  };
  const make = String(entry?.make || '').trim();
  const model = String(entry?.model || '').trim();
  const module = String(entry?.module || '').trim().toUpperCase();
  if (make) norm.make = make;
  if (model) norm.model = model;
  if (module) norm.module = module;
  return norm;
};

const normalizeContext = (context = {}) => ({
  make: String(context.make || '').trim().toLowerCase(),
  model: String(context.model || '').trim().toLowerCase(),
  module: String(context.module || '').trim().toUpperCase(),
  system: String(context.system || '').trim().toLowerCase(),
});

const readStoredPack = () => {
  try {
    const raw = localStorage.getItem(PACK_KEY);
    if (!raw) return null;
    const pack = JSON.parse(raw);
    return pack && Array.isArray(pack.codes) ? pack : null;
  } catch {
    return null;
  }
};

/* Multiple entries may share a code when they describe different makes,
 * models or modules (for example a Toyota P2714 and a generic P2714). */
const buildPackIndex = (codes = []) => {
  const index = {};
  const seen = new Set();
  for (const entry of codes) {
    const norm = normalizeCode(entry);
    if (!CODE_RE.test(norm.code)) continue;
    const key = [norm.code, norm.make || '', norm.model || '', norm.module || ''].join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    (index[norm.code] ||= []).push(norm);
  }
  return index;
};

const initialPack = readStoredPack();
let packIndex = {};
let packInfo = null;
if (initialPack) {
  packIndex = buildPackIndex(initialPack.codes);
  if (Object.keys(packIndex).length) {
    packInfo = {
      version: String(initialPack.version || 'custom'),
      updatedAt: initialPack.updatedAt || null,
      source: String(initialPack.source || 'downloaded pack'),
    };
  }
}

const scoreEntry = (entry, ctx) => {
  let score = 0;
  const make = String(entry.make || '').toLowerCase();
  const model = String(entry.model || '').toLowerCase();
  const module = String(entry.module || '').toUpperCase();
  if (make) {
    if (!ctx.make || make !== ctx.make) return -1;
    score += 4;
  }
  if (model) {
    if (!ctx.model || !ctx.model.includes(model)) return -1;
    score += 2;
  }
  if (module) {
    if (!ctx.module || module !== ctx.module) return -1;
    score += 3;
  }
  if (entry.system && ctx.system && entry.system.toLowerCase() === ctx.system) score += 1;
  return score;
};

const fallbackDtc = (key) => ({
  code: key,
  description: 'Manufacturer-specific or undocumented trouble code',
  system: dtcSystem(key),
  severity: 'medium',
  causes: ['Component fault', 'Wiring or connector issue', 'Control module fault'],
  symptoms: ['Check engine light', 'Reduced performance'],
  source: 'fallback',
});

/* Look up a code with optional vehicle context:
 *   lookupDtc('P2714', { make: 'Toyota', model: 'Camry', module: 'TCM' })
 * A matching make/model/module entry beats a generic one; a mismatch is
 * ignored so a Dodge code never shows Toyota-specific text. */
export const lookupDtc = (code, context = {}) => {
  const key = String(code || '').toUpperCase().trim();
  const ctx = normalizeContext(context);
  const candidates = packIndex[key] || [];
  let best = null;
  let bestScore = -1;
  for (const entry of candidates) {
    const score = scoreEntry(entry, ctx);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (best && bestScore >= 0) return { ...best, source: 'pack' };
  if (DTC_MAP[key]) return { ...DTC_MAP[key], source: 'builtin' };

  const generic = candidates.find((entry) => !entry.make && !entry.model && !entry.module);
  if (generic) return { ...generic, source: 'pack' };

  // Without a vehicle profile there is nothing to score against. Return the
  // first pack entry but flag it so the UI can show the vehicle scope.
  if (!ctx.make && !ctx.model && !ctx.module && candidates.length) {
    return { ...candidates[0], source: 'pack', contextMismatch: true };
  }
  return fallbackDtc(key);
};

export const dtcLibraryInfo = () => {
  const entries = Object.values(packIndex).flat();
  return {
    version: DTC_LIBRARY_VERSION,
    builtIn: DTC_DATABASE.length,
    downloaded: entries.length,
    downloadedCodes: Object.keys(packIndex).length,
    packVersion: packInfo?.version || null,
    packUpdatedAt: packInfo?.updatedAt || null,
    packSource: packInfo?.source || null,
  };
};

/* Validate and install a downloaded pack. Throws on unusable input. */
export const applyDtcPack = (pack) => {
  if (!pack || !Array.isArray(pack.codes)) throw new Error('Code pack is not a valid AutoPulse pack');
  const next = buildPackIndex(pack.codes);
  const entries = Object.values(next).flat();
  if (!entries.length) throw new Error('Code pack contains no usable trouble codes');

  packIndex = next;
  packInfo = {
    version: String(pack.version || 'custom'),
    updatedAt: pack.updatedAt || null,
    source: String(pack.source || 'downloaded pack'),
  };
  try {
    localStorage.setItem(PACK_KEY, JSON.stringify({
      version: packInfo.version,
      updatedAt: packInfo.updatedAt,
      source: packInfo.source,
      codes: entries,
    }));
  } catch {
    /* storage full or unavailable: the pack still applies for this session */
  }
  return { ...dtcLibraryInfo(), count: entries.length };
};

export const clearDtcPack = () => {
  packIndex = {};
  packInfo = null;
  try { localStorage.removeItem(PACK_KEY); } catch { /* ignore */ }
  return dtcLibraryInfo();
};

const versionParts = (value) => String(value || '').split('.').map((part) => Number(part));
const numericVersion = (parts) => parts.length > 0 && parts.every((n) => Number.isFinite(n));
const isNewerVersion = (a, b) => {
  const pa = versionParts(a);
  const pb = versionParts(b);
  if (!numericVersion(pa) || !numericVersion(pb)) return false;
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
};

/* Load the pack bundled with the app when the user has no pack yet, or when
 * the bundled pack is a newer numeric version than the stored one. A stored
 * custom pack (non-numeric version) is never overwritten automatically. */
export const loadBundledDtcPack = async () => {
  try {
    const url = new URL('../../data/dtc-pack.json', import.meta.url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return dtcLibraryInfo();
    const pack = await res.json();
    if (packInfo && !isNewerVersion(pack.version, packInfo.version)) return dtcLibraryInfo();
    return applyDtcPack(pack);
  } catch {
    return dtcLibraryInfo();
  }
};


export const severityRank = (s) => ({ low: 1, medium: 2, high: 3 }[s] || 2);

export const DEMO_DTCS = [
  { code: 'P0171', status: 'stored', ecu: 'ECM', freezeFrame: true },
  { code: 'P0301', status: 'pending', ecu: 'ECM', freezeFrame: false },
  { code: 'P0133', status: 'stored', ecu: 'ECM', freezeFrame: true },
];

export const READINESS_MONITORS = [
  { key: 'misfire', name: 'Misfire monitor', type: 'continuous', supports: true },
  { key: 'fuelSystem', name: 'Fuel system monitor', type: 'continuous', supports: true },
  { key: 'components', name: 'Comprehensive components', type: 'continuous', supports: true },
  { key: 'catalyst', name: 'Catalyst monitor', type: 'non-continuous', supports: true },
  { key: 'heatedCatalyst', name: 'Heated catalyst monitor', type: 'non-continuous', supports: false },
  { key: 'evap', name: 'EVAP system monitor', type: 'non-continuous', supports: true },
  { key: 'secondaryAir', name: 'Secondary air system', type: 'non-continuous', supports: false },
  { key: 'o2Sensor', name: 'O2 sensor monitor', type: 'non-continuous', supports: true },
  { key: 'o2Heater', name: 'O2 sensor heater monitor', type: 'non-continuous', supports: true },
  { key: 'egr', name: 'EGR / VVT system monitor', type: 'non-continuous', supports: true },
];
