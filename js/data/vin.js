/* AutoPulse OBD2 — VIN decoding and NHTSA safety recall lookup
 *
 * Specs come from the free, official NHTSA vPIC service:
 *   https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/{VIN}
 * Safety campaigns come from:
 *   https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=
 *
 * Both services are public and CORS-enabled, so the hosted PWA can call them
 * directly. Results are cached on the vehicle profile by the UI layer, which
 * keeps specs and recalls visible when the car is offline.
 *
 * This module only normalises data the services actually return. It never
 * invents missing specs or vehicle history.
 */

const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended';
const RECALL_BASE = 'https://api.nhtsa.gov/recalls/recallsByVehicle';

/* VINs exclude I, O and Q so they cannot be confused with 1 and 0. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const KEEP_UPPER = new Set(['BMW', 'GMC', 'RAM', 'MG', 'DS', 'BYD', 'KTM', 'MINI', 'VW']);

const titleCaseWord = (word = '') => {
  const clean = String(word);
  if (KEEP_UPPER.has(clean.toUpperCase())) return clean.toUpperCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

const titleCase = (value = '') => String(value)
  .split(' ')
  .map((word) => word.split('-').map(titleCaseWord).join('-'))
  .join(' ');

export const normalizeVin = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '');

export const isValidVin = (value = '') => VIN_RE.test(normalizeVin(value));

/* North American VIN check digit (position 9). This is advisory: valid VINs
 * from some markets and a few edge-case vehicles do not satisfy it. */
export const vinCheckDigit = (value = '') => {
  const vin = normalizeVin(value);
  if (vin.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < vin.length; i += 1) {
    const char = vin[i];
    const digit = /[0-9]/.test(char) ? Number(char) : TRANSLITERATION[char];
    if (digit === undefined) return null;
    sum += digit * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const computed = remainder === 10 ? 'X' : String(remainder);
  return { actual: vin[8], computed, valid: vin[8] === computed };
};

const clean = (value) => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text || text === '0' || /^not applicable$/i.test(text) || /^unknown$/i.test(text)) return '';
  return text;
};

const numberOrNull = (value) => {
  const text = clean(value);
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const jsonFetch = async (url, fetchImpl) => {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('Network lookup is not available in this environment.');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;
  try {
    const response = await doFetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (!response.ok) throw new Error(`NHTSA returned HTTP ${response.status}.`);
    return await response.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('NHTSA took too long to respond.');
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const collectAirbags = (raw) => {
  const entries = [
    ['Front', raw.AirBagLocFront],
    ['Side', raw.AirBagLocSide],
    ['Curtain', raw.AirBagLocCurtain],
    ['Knee', raw.AirBagLocKnee],
    ['Seat', raw.AirBagLocSeatCushion],
  ];
  return entries
    .map(([label, value]) => {
      const text = clean(value);
      return text ? `${label}: ${text}` : '';
    })
    .filter(Boolean);
};

/* Turn a vPIC result into a compact, display-ready spec object. */
export const mapVpicResult = (raw, vin = '') => {
  if (!raw || typeof raw !== 'object') return null;
  const specs = {
    vin: clean(raw.VIN) || normalizeVin(vin),
    make: titleCase(clean(raw.Make)),
    model: clean(raw.Model),
    year: numberOrNull(raw.ModelYear),
    trim: clean(raw.Trim),
    series: clean(raw.Series),
    bodyClass: clean(raw.BodyClass),
    vehicleType: clean(raw.VehicleType),
    engineModel: clean(raw.EngineModel),
    engineCylinders: numberOrNull(raw.EngineCylinders),
    displacementL: numberOrNull(raw.DisplacementL),
    displacementCc: numberOrNull(raw.DisplacementCC),
    engineHp: numberOrNull(raw.EngineHP),
    engineKw: numberOrNull(raw.EngineKW),
    fuelType: clean(raw.FuelTypePrimary),
    fuelTypeSecondary: clean(raw.FuelTypeSecondary),
    transmissionStyle: clean(raw.TransmissionStyle),
    transmissionSpeeds: numberOrNull(raw.TransmissionSpeeds),
    driveType: clean(raw.DriveType),
    doors: numberOrNull(raw.Doors),
    plantCity: clean(raw.PlantCity),
    plantState: clean(raw.PlantState),
    plantCountry: clean(raw.PlantCountry),
    gvwr: clean(raw.GVWR),
    airbags: collectAirbags(raw),
    abs: clean(raw.ABS),
    esc: clean(raw.ESC),
    errorCode: clean(raw.ErrorCode),
    errorText: clean(raw.ErrorText),
    source: 'NHTSA vPIC',
    decodedAt: Date.now(),
  };
  if (!specs.make && !specs.model && !specs.year) return null;
  return specs;
};

/* Decode a VIN with NHTSA vPIC. Throws with a friendly message when the VIN is
 * incomplete, the network is unavailable, or NHTSA cannot identify the car. */
export const decodeVin = async (vin, { fetchImpl = null } = {}) => {
  const normalized = normalizeVin(vin);
  if (!isValidVin(normalized)) {
    throw new Error('Enter a complete 17-character VIN (letters I, O and Q are not used).');
  }
  const data = await jsonFetch(
    `${VPIC_BASE}/${encodeURIComponent(normalized)}?format=json`,
    fetchImpl,
  );
  const raw = data?.Results?.[0];
  const specs = mapVpicResult(raw, normalized);
  if (!specs) {
    throw new Error('NHTSA could not decode this VIN. Check the number and try again.');
  }
  return specs;
};

export const mapRecall = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const campaign = clean(raw.NHTSACampaignNumber);
  const summary = clean(raw.Summary);
  if (!campaign && !summary) return null;
  return {
    campaign,
    component: clean(raw.Component),
    summary,
    consequence: clean(raw.Consequence),
    remedy: clean(raw.Remedy),
    date: clean(raw.ReportReceivedDate),
    manufacturer: clean(raw.Manufacturer),
    parkIt: raw.parkIt === true || raw.parkIt === 'true',
    parkOutside: raw.parkOutSide === true || raw.parkOutSide === 'true',
  };
};

/* NHTSA's recall database uses base model names ("Camry"), while profiles may
 * include a trim or engine ("Camry 2.5"). Try the full name, then progressively
 * drop trailing engine/trim tokens. */
export const recallModelCandidates = (model = '') => {
  const original = String(model || '').replace(/\s+/g, ' ').trim();
  if (!original) return [];
  const candidates = [original];
  let current = original.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (current !== original) candidates.push(current);
  for (let i = 0; i < 4; i += 1) {
    const next = current
      .replace(/\s+\d+(?:\.\d+)?\s*(?:L|T|TSI|TDI|V6|V8|I4|I6|EcoBoost|Hybrid)?$/i, '')
      .replace(/\s+(?:TSI|TDI|EcoBoost|Hybrid)$/i, '')
      .trim();
    if (!next || next === current) break;
    candidates.push(next);
    current = next;
  }
  return [...new Set(candidates.filter(Boolean))];
};

/* Fetch safety recalls for a make/model/year. Returns an empty array when
 * NHTSA has no campaigns for the vehicle. */
export const fetchRecalls = async ({ make, model, year, fetchImpl = null } = {}) => {
  const makeText = String(make || '').trim();
  const yearText = String(year || '').trim();
  const models = recallModelCandidates(model);
  if (!makeText || !models.length || !yearText) {
    throw new Error('Make, model and year are needed for a recall check.');
  }

  for (const candidate of models) {
    const params = new URLSearchParams({
      make: makeText,
      model: candidate,
      modelYear: yearText,
    });
    const data = await jsonFetch(`${RECALL_BASE}?${params.toString()}`, fetchImpl);
    const results = Array.isArray(data?.results) ? data.results : Array.isArray(data?.Results) ? data.Results : [];
    if (results.length) {
      return results.map(mapRecall).filter(Boolean);
    }
  }
  return [];
};
