/* AutoPulse OBD2 — vehicle specs, recalls and local history modal */

import { getState, updateVehicle, activeVehicle } from '../core/store.js';
import { decodeVin, fetchRecalls, isValidVin, normalizeVin, vinCheckDigit } from '../data/vin.js';
import { collectVehicleHistory } from '../core/vehicle-history.js';
import { formatDistance, formatSpeed, formatVolume, units } from '../core/display.js';
import { icon } from '../core/icons.js';
import { modal } from './components.js';
import { escapeHtml, fmtDate, fmtTime } from '../core/utils.js';

const vehicleLabel = (vehicle) => {
  if (!vehicle?.make && !vehicle?.model) return vehicle?.name || 'Vehicle';
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
};

const engineSummary = (specs) => {
  const parts = [];
  if (specs.engineModel) parts.push(specs.engineModel);
  if (specs.displacementL) parts.push(`${specs.displacementL} L`);
  if (specs.engineCylinders) parts.push(`${specs.engineCylinders}-cyl`);
  return parts.join(' · ');
};

const powerSummary = (specs) => {
  const parts = [];
  if (specs.engineHp) parts.push(`${specs.engineHp} hp`);
  if (specs.engineKw) parts.push(`${specs.engineKw} kW`);
  return parts.join(' · ');
};

const transmissionSummary = (specs) => {
  const parts = [];
  if (specs.transmissionStyle) parts.push(specs.transmissionStyle);
  if (specs.transmissionSpeeds) parts.push(`${specs.transmissionSpeeds}-speed`);
  return parts.join(' · ');
};

const specRows = (specs = {}) => {
  const rows = [];
  const add = (label, value) => {
    const text = String(value || '').trim();
    if (text) rows.push([label, text]);
  };
  add('Body', specs.bodyClass);
  add('Engine', engineSummary(specs));
  add('Power', powerSummary(specs));
  add('Fuel', [specs.fuelType, specs.fuelTypeSecondary].filter(Boolean).join(' + '));
  add('Transmission', transmissionSummary(specs));
  add('Drive', specs.driveType);
  add('Doors', specs.doors);
  add('Trim', specs.trim);
  add('Series', specs.series);
  add('Built in', [specs.plantCity, specs.plantState, specs.plantCountry].filter(Boolean).join(', '));
  add('GVWR', specs.gvwr);
  add('Airbags', (specs.airbags || []).join(' · '));
  add('ABS', specs.abs);
  add('ESC', specs.esc);
  return rows;
};

const specsHtml = (vehicle, busy) => {
  const specs = vehicle.vinSpecs || null;
  const rows = specs ? specRows(specs) : [];
  const check = vinCheckDigit(vehicle.vin);
  const checkNote = check
    ? check.valid
      ? 'VIN check digit verified.'
      : `VIN check digit does not calculate (reported ${check.actual}, expected ${check.computed}). Some valid non-US VINs fail this test.`
    : '';

  return `
    <div class="card flat">
      <div class="card-head">
        <h3>${icon('info')} Vehicle specs</h3>
        ${specs ? '<span class="badge info">NHTSA vPIC</span>' : ''}
      </div>
      ${specs && rows.length
        ? `<div class="stack" style="gap:0">
            ${rows.map(([label, value]) => `<div class="kv"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>`).join('')}
          </div>`
        : `<p class="small muted">${vehicle.vin
          ? 'No decoded specs are saved yet. Use Decode VIN to load them.'
          : 'Add a VIN in the Garage to load manufacturer specs automatically.'}</p>`}
      ${specs ? `<p class="small muted" style="margin-top:8px">Decoded ${escapeHtml(fmtDate(vehicle.vinDecodedAt || specs.decodedAt))}. ${escapeHtml(checkNote)}</p>` : ''}
      ${specs?.errorText ? `<p class="small muted">${escapeHtml(specs.errorText)}</p>` : ''}
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" data-lookup type="button" ${busy || !isValidVin(vehicle.vin) ? 'disabled' : ''}>
          ${icon('refresh')}<span>${busy ? 'Looking up…' : specs ? 'Refresh from VIN' : 'Decode VIN'}</span>
        </button>
        <button class="btn btn-sm" data-garage type="button">${icon('car')}<span>Open Garage</span></button>
      </div>
    </div>`;
};

const recallItem = (recall) => `
  <div class="recall-item">
    <div class="row between" style="gap:8px;align-items:flex-start">
      <b class="mono small">${escapeHtml(recall.campaign || 'Recall')}</b>
      ${recall.parkIt || recall.parkOutside ? `<span class="badge warn">Do not park indoors</span>` : ''}
    </div>
    <div class="small muted">${escapeHtml(recall.component || 'Component not listed')}</div>
    ${recall.summary ? `<p class="small">${escapeHtml(recall.summary)}</p>` : ''}
    ${recall.remedy ? `<p class="small muted"><b>Remedy:</b> ${escapeHtml(recall.remedy)}</p>` : ''}
    <div class="small muted">${escapeHtml([recall.manufacturer, recall.date].filter(Boolean).join(' · '))}</div>
  </div>`;

const recallsHtml = (vehicle, busy) => {
  const recalls = Array.isArray(vehicle.vinRecalls) ? vehicle.vinRecalls : [];
  const checkedAt = vehicle.vinRecallsAt;
  return `
    <div class="card flat">
      <div class="card-head">
        <h3>${icon('shield')} Safety recalls</h3>
        ${recalls.length
          ? `<span class="badge danger">${recalls.length} campaign${recalls.length === 1 ? '' : 's'}</span>`
          : checkedAt ? '<span class="badge ok">None found</span>' : ''}
      </div>
      ${recalls.length
        ? `<div class="recall-list">${recalls.map(recallItem).join('')}</div>`
        : `<p class="small muted">${checkedAt
          ? `NHTSA returned no safety campaigns for this vehicle when checked ${escapeHtml(fmtDate(checkedAt))}.`
          : 'Check the official NHTSA safety recall data for this vehicle.'}</p>`}
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" data-recalls type="button" ${busy ? 'disabled' : ''}>
          ${icon('shield')}<span>${busy ? 'Checking…' : recalls.length || checkedAt ? 'Refresh recalls' : 'Check recalls'}</span>
        </button>
      </div>
    </div>`;
};

const historyItem = (item) => {
  const u = units();
  if (item.kind === 'trip') {
    return `<div class="hist-item">
      <span class="hist-ico trip">${icon('route')}</span>
      <div class="hist-body"><b>Trip</b><span class="small muted">${escapeHtml(fmtTime(item.duration))} · max ${formatSpeed(item.maxSpeedKmh)} ${u.speed}</span></div>
      <div class="hist-meta"><b>${formatDistance(item.distanceKm, 1)} ${u.distance}</b><span>${escapeHtml(fmtDate(item.at, false))}</span></div>
    </div>`;
  }
  if (item.kind === 'service') {
    return `<div class="hist-item">
      <span class="hist-ico service">${icon('wrench')}</span>
      <div class="hist-body"><b>${escapeHtml(item.title)}</b><span class="small muted">${escapeHtml(item.subtitle || 'Service record')}</span></div>
      <div class="hist-meta"><b>${escapeHtml(item.status || 'Logged')}</b><span>${escapeHtml(fmtDate(item.at, false))}</span></div>
    </div>`;
  }
  return `<div class="hist-item">
    <span class="hist-ico perf">${icon('flag')}</span>
    <div class="hist-body"><b>${escapeHtml(item.title)}</b><span class="small muted">Performance run</span></div>
    <div class="hist-meta"><b>${item.value.toFixed(2)} s</b><span>${escapeHtml(fmtDate(item.at, false))}</span></div>
  </div>`;
};

const historyHtml = (vehicle) => {
  const u = units();
  const history = collectVehicleHistory(getState(), vehicle);
  const { stats } = history;
  return `
    <div class="card flat">
      <div class="card-head">
        <h3>${icon('route')} Local history</h3>
        <span class="badge">${history.timeline.length} event${history.timeline.length === 1 ? '' : 's'}</span>
      </div>
      <div class="vehicle-stats">
        <div><b>${formatDistance(stats.distanceKm, 1)}</b><span>${u.distance} driven</span></div>
        <div><b>${stats.tripCount}</b><span>${stats.tripCount === 1 ? 'Trip' : 'Trips'}</span></div>
        <div><b>${formatVolume(stats.fuelUsedL, 1)}</b><span>${u.volume} fuel</span></div>
        <div><b>${stats.serviceCount}</b><span>Service</span></div>
        <div><b>${stats.perfCount}</b><span>${stats.perfCount === 1 ? 'Perf run' : 'Perf runs'}</span></div>
      </div>
      ${stats.bestPerf.length
        ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">${stats.bestPerf.map((best) => `<span class="chip">${escapeHtml(best.label)} ${best.value.toFixed(2)} s</span>`).join('')}</div>`
        : ''}
      ${history.timeline.length
        ? `<div class="hist-list">${history.timeline.slice(0, 8).map(historyItem).join('')}</div>`
        : `<p class="small muted" style="margin-top:10px">No trips, service records or performance runs are linked to this vehicle yet.</p>`}
      <p class="small muted" style="margin-top:10px">Records made before v1.6 were not tagged with a vehicle, so they are not attributed here. NHTSA publishes safety recalls, not accident, owner or paid service-history reports.</p>
    </div>`;
};

const bodyHtml = (vehicle, note, busy) => `
  <div class="vehicle-details">
    <div class="row between" style="gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div>
        <h4 class="vehicle-title">${escapeHtml(vehicleLabel(vehicle))}</h4>
        <div class="mono small muted">VIN ${escapeHtml(vehicle.vin || '—')}</div>
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        ${vehicle.id === getState().activeVehicleId ? '<span class="chip accent">Active vehicle</span>' : ''}
        ${vehicle.plate ? `<span class="chip">${escapeHtml(vehicle.plate)}</span>` : ''}
      </div>
    </div>
    ${note ? `<div class="callout ${note.type || ''}">${icon(note.type === 'warn' ? 'alert' : note.type === 'ok' ? 'check' : 'info')}<div>${escapeHtml(note.text)}</div></div>` : ''}
    <div class="grid grid-2" style="margin-top:14px">
      ${specsHtml(vehicle, busy)}
      ${recallsHtml(vehicle, busy)}
    </div>
    <div style="margin-top:14px">${historyHtml(vehicle)}</div>
    <div class="callout" style="margin-top:14px">${icon('shield')}<div>Specs and recalls come from official NHTSA public data. They are a guide, not a substitute for the manufacturer's build sheet or a dealer recall check by VIN.</div></div>
  </div>`;

/* Open the specs/history modal for one vehicle. `onChange` lets the caller
 * refresh whatever screen opened the modal. */
export const openVehicleDetails = (vehicleId, { onChange = null } = {}) => {
  let note = null;
  let busy = false;

  const current = () => getState().vehicles.find((v) => v.id === vehicleId) || activeVehicle();

  const api = modal({
    title: 'Specs & history',
    subtitle: 'Manufacturer data, safety recalls and local records',
    wide: true,
    body: '<div id="vdRoot"></div>',
    actions: [{ label: 'Close' }],
  });

  const root = api.body.querySelector('#vdRoot');
  if (!root) return api;

  const draw = () => {
    root.innerHTML = bodyHtml(current(), note, busy);
    bind();
  };

  const identityPatch = (vehicle, specs) => {
    const patch = { id: vehicle.id };
    if (!vehicle.make) patch.make = specs.make || '';
    if (!vehicle.model) patch.model = specs.model || '';
    if (!vehicle.year || (!vehicle.make && !vehicle.model)) patch.year = specs.year || vehicle.year;
    if (!vehicle.fuel) patch.fuel = specs.fuelType || vehicle.fuel;
    if (!vehicle.name || vehicle.name === 'My vehicle') {
      patch.name = `${specs.make || ''} ${specs.model || ''}`.trim() || vehicle.name;
    }
    return patch;
  };

  const lookup = async () => {
    const vehicle = current();
    const vin = normalizeVin(vehicle.vin);
    if (!isValidVin(vin)) {
      note = { type: 'warn', text: 'Add a complete 17-character VIN in the Garage first.' };
      draw();
      return;
    }

    busy = true;
    note = { type: '', text: 'Contacting NHTSA vPIC for specs…' };
    draw();

    const messages = [];
    let specs = vehicle.vinSpecs || null;

    try {
      const decoded = await decodeVin(vin);
      updateVehicle({ ...identityPatch(vehicle, decoded), vinSpecs: decoded, vinDecodedAt: decoded.decodedAt });
      specs = decoded;
      messages.push('Specs updated from NHTSA vPIC.');
    } catch (err) {
      messages.push(vehicle.vinSpecs
        ? `Could not reach NHTSA (${err.message}) Showing the last saved decode.`
        : `Could not decode the VIN: ${err.message}`);
    }

    const latest = current();
    const make = specs?.make || latest.make;
    const model = specs?.model || latest.model;
    const year = specs?.year || latest.year;
    if (make && model && year) {
      note = { type: '', text: `${messages.join(' ')} Checking safety recalls…` };
      draw();
      try {
        const recalls = await fetchRecalls({ make, model, year });
        updateVehicle({ id: latest.id, vinRecalls: recalls, vinRecallsAt: Date.now() });
        messages.push(recalls.length
          ? `${recalls.length} NHTSA safety campaign${recalls.length === 1 ? '' : 's'} found.`
          : 'No NHTSA safety campaigns found.');
      } catch (err) {
        messages.push(`Recall check failed: ${err.message}`);
      }
    }

    const failed = messages.some((message) => /could not|failed/i.test(message));
    note = { type: failed ? 'warn' : 'ok', text: messages.join(' ') };
    busy = false;
    if (onChange) onChange();
    draw();
  };

  const checkRecalls = async () => {
    const vehicle = current();
    const specs = vehicle.vinSpecs || {};
    const make = specs.make || vehicle.make;
    const model = specs.model || vehicle.model;
    const year = specs.year || vehicle.year;
    if (!make || !model || !year) {
      note = { type: 'warn', text: 'Decode the VIN first, or add make, model and year in the Garage.' };
      draw();
      return;
    }

    busy = true;
    note = { type: '', text: 'Checking NHTSA safety recalls…' };
    draw();
    try {
      const recalls = await fetchRecalls({ make, model, year });
      updateVehicle({ id: vehicle.id, vinRecalls: recalls, vinRecallsAt: Date.now() });
      note = {
        type: recalls.length ? 'warn' : 'ok',
        text: recalls.length
          ? `${recalls.length} safety campaign${recalls.length === 1 ? '' : 's'} found. Open the campaign details below and contact a dealer for the free remedy.`
          : `NHTSA returned no safety campaigns for ${vehicleLabel(vehicle)}. This is not proof the car has no recalls; a dealer VIN check is authoritative.`,
      };
      if (onChange) onChange();
    } catch (err) {
      note = { type: 'warn', text: `Recall check failed: ${err.message}` };
    }
    busy = false;
    draw();
  };

  const bind = () => {
    root.querySelector('[data-lookup]')?.addEventListener('click', lookup);
    root.querySelector('[data-recalls]')?.addEventListener('click', checkRecalls);
    root.querySelector('[data-garage]')?.addEventListener('click', () => {
      api.close();
      location.hash = '#/garage';
    });
  };

  draw();
  return api;
};
