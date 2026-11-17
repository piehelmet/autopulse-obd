/* AutoPulse OBD2 — garage / vehicle profiles */

import { getState, addVehicle, updateVehicle, removeVehicle, setActiveVehicle, activeVehicle } from '../core/store.js';
import { VEHICLE_PRESETS } from '../data/vehicles.js';
import { formatDistance, formatVolume, units } from '../core/display.js';
import { decodeVin, fetchRecalls, isValidVin, normalizeVin } from '../data/vin.js';
import { collectVehicleHistory } from '../core/vehicle-history.js';
import { openVehicleDetails } from './vehicle-details.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, field } from './components.js';
import { escapeHtml, fmtDate } from '../core/utils.js';

const identityLine = (vehicle) => {
  if (!vehicle?.make && !vehicle?.model) return 'Add make and model';
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
};

const specLine = (vehicle) => {  const specs = vehicle.vinSpecs;
  if (!specs) return 'Not decoded';
  const parts = [];
  if (specs.engineModel) parts.push(specs.engineModel);
  if (specs.displacementL) parts.push(`${specs.displacementL} L`);
  if (specs.engineHp) parts.push(`${specs.engineHp} hp`);
  if (!parts.length && specs.bodyClass) parts.push(specs.bodyClass);
  return parts.join(' · ') || 'Decoded';
};

const recallChip = (vehicle) => {
  const count = Array.isArray(vehicle.vinRecalls) ? vehicle.vinRecalls.length : 0;
  if (count) return `<span class="chip warn">${icon('alert')}<span>${count} recall${count === 1 ? '' : 's'}</span></span>`;
  if (vehicle.vinRecallsAt) return `<span class="chip ok">${icon('check')}<span>No recalls</span></span>`;
  return '';
};

export const render = (view) => {
  const build = () => {
    const s = getState();
    const active = activeVehicle();
    const u = units();

    view.innerHTML = `
      ${pageHead('Garage', 'Vehicle profiles keep VIN, specs and trip statistics separate for each car.', `
        <button class="btn btn-sm btn-primary" id="garageAddBtn" type="button">${icon('plus')}<span>Add vehicle</span></button>
      `)}
      <div class="grid grid-3">
        ${s.vehicles.map((v) => {
          const history = collectVehicleHistory(s, v);
          const distance = history.stats.distanceKm;
          const isActive = v.id === s.activeVehicleId;
          return `<div class="card ${isActive ? 'glow' : ''}" style="border-color:${isActive ? 'rgba(var(--accent-rgb),.4)' : 'var(--line)'}">
            <div class="card-head">
              <div>
                <h3>${icon('car')} ${escapeHtml(v.name || `${v.make} ${v.model}`)}</h3>
                <div class="sub">${escapeHtml(identityLine(v))}</div>
              </div>
              <div class="row" style="gap:5px;flex-wrap:wrap;justify-content:flex-end">
                ${isActive ? '<span class="chip accent">Active</span>' : ''}
                ${recallChip(v)}
              </div>
            </div>
            <div class="stack" style="gap:0">
              <div class="kv"><span class="k">VIN</span><span class="v mono" style="font-size:11px">${escapeHtml(v.vin || '—')}</span></div>
              <div class="kv"><span class="k">Plate</span><span class="v">${escapeHtml(v.plate || '—')}</span></div>
              <div class="kv"><span class="k">Specs</span><span class="v">${escapeHtml(specLine(v))}</span></div>
              <div class="kv"><span class="k">Fuel</span><span class="v">${escapeHtml(v.fuel || '—')}</span></div>
              <div class="kv"><span class="k">Tank</span><span class="v">${formatVolume(v.tank || 0, 1)} ${u.volume}</span></div>
              <div class="kv"><span class="k">Odometer</span><span class="v">${formatDistance(v.odometer || 0)} ${u.distance}</span></div>
              <div class="kv"><span class="k">History</span><span class="v">${history.stats.tripCount} trip${history.stats.tripCount === 1 ? '' : 's'} · ${formatDistance(distance, 1)} ${u.distance} · ${history.stats.serviceCount} service</span></div>
            </div>
            ${v.notes ? `<p class="small muted" style="margin-top:10px">${escapeHtml(v.notes)}</p>` : ''}
            <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">
              <button class="btn btn-sm btn-primary" type="button" data-details="${v.id}">${icon('info')}<span>Specs &amp; history</span></button>
              ${isActive ? '<span class="chip ok">Selected for connection</span>' : `<button class="btn btn-sm" type="button" data-select="${v.id}">${icon('check')}<span>Select</span></button>`}
              <button class="btn btn-sm" type="button" data-edit="${v.id}">${icon('edit')}<span>Edit</span></button>
              <button class="btn btn-sm btn-ghost" type="button" data-delete="${v.id}" ${s.vehicles.length <= 1 ? 'disabled' : ''}>${icon('trash')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="card flat" style="margin-top:16px">
        <div class="card-head">
          <h3>${icon('info')} Active vehicle</h3>
          <button class="btn btn-sm" type="button" id="garageActiveDetails">${icon('info')}<span>Specs &amp; history</span></button>
        </div>
        <div class="grid grid-2">
          <div>
            <div class="kv"><span class="k">Profile</span><span class="v">${escapeHtml(active?.name || '—')}</span></div>
            <div class="kv"><span class="k">VIN</span><span class="v mono" style="font-size:11px">${escapeHtml(active?.vin || '—')}</span></div>
            <div class="kv"><span class="k">Specs</span><span class="v">${escapeHtml(specLine(active || {}))}</span></div>
            <div class="kv"><span class="k">Fuel type</span><span class="v">${escapeHtml(active?.fuel || '—')}</span></div>
          </div>
          <div>
            <div class="kv"><span class="k">Tank capacity</span><span class="v">${formatVolume(active?.tank || 0, 1)} ${u.volume}</span></div>
            <div class="kv"><span class="k">Odometer</span><span class="v">${formatDistance(active?.odometer || 0)} ${u.distance}</span></div>
            <div class="kv"><span class="k">Safety recalls</span><span class="v">${Array.isArray(active?.vinRecalls) && active.vinRecalls.length ? `${active.vinRecalls.length} campaign${active.vinRecalls.length === 1 ? '' : 's'}` : active?.vinRecallsAt ? 'None found' : 'Not checked'}</span></div>
            <div class="kv"><span class="k">Added</span><span class="v">${escapeHtml(fmtDate(active?.createdAt, false))}</span></div>
          </div>
        </div>
      </div>

      <div class="callout" style="margin-top:14px">${icon('shield')}<div>Vehicle profiles are stored locally in this browser. VIN decoding and recall checks use the official NHTSA public services. Nothing is uploaded except the VIN or make/model/year needed for that lookup. Use Export in Settings to back profiles up.</div></div>`;

    bind();
  };

  const bind = () => {
    view.querySelector('#garageAddBtn')?.addEventListener('click', () => openVehicleModal(null, build));
    view.querySelector('#garageActiveDetails')?.addEventListener('click', () => {
      const v = activeVehicle();
      if (v) openVehicleDetails(v.id, { onChange: build });
    });
    view.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => {
      openVehicleDetails(b.dataset.details, { onChange: build });
    }));
    view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      const v = getState().vehicles.find((x) => x.id === b.dataset.edit);
      if (v) openVehicleModal(v, build);
    }));
    view.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => {
      setActiveVehicle(b.dataset.select);
      const v = activeVehicle();
      toast('Vehicle selected', { message: `${v.name} is now the active profile.`, type: 'ok' });
      build();
    }));
    view.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', async () => {
      const v = getState().vehicles.find((x) => x.id === b.dataset.delete);
      if (!v) return;
      const ok = await confirmDialog({
        title: `Remove ${v.name}?`,
        message: 'The vehicle profile is deleted from this device. Recorded trips remain in history but lose their vehicle link.',
        okLabel: 'Remove vehicle',
        danger: true,
        iconName: 'trash',
      });
      if (!ok) return;
      removeVehicle(v.id);
      toast('Vehicle removed', { type: 'ok' });
      build();
    }));
  };

  build();
  return () => {};
};

const openVehicleModal = (vehicle, done) => {
  const isEdit = Boolean(vehicle);
  const v = vehicle || { name: '', make: '', model: '', year: new Date().getFullYear(), vin: '', plate: '', fuel: 'Gasoline', tank: 55, odometer: 0, notes: '' };
  const originalVin = normalizeVin(v.vin || '');
  let autoTimer = null;

  const lookup = {
    vin: originalVin,
    specs: v.vinSpecs || null,
    at: v.vinDecodedAt || 0,
    recalls: Array.isArray(v.vinRecalls) ? v.vinRecalls : [],
    recallsAt: v.vinRecallsAt || 0,
    recallError: '',
    busy: false,
    error: '',
  };

  const api = modal({
    title: isEdit ? 'Edit vehicle' : 'Add vehicle',
    subtitle: 'Details are used for fuel calculations, specs and trip statistics.',
    wide: true,
    body: `
      <div class="field" style="margin-bottom:12px">
        <label>Start from a preset (optional)</label>
        <select id="vehPreset">
          <option value="">— Custom vehicle —</option>
          ${VEHICLE_PRESETS.map((p, i) => `<option value="${i}">${escapeHtml(p.label)}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        ${field('Profile name', `<input type="text" id="vehName" maxlength="40" value="${escapeHtml(v.name || '')}" placeholder="e.g. My Golf" />`)}
        ${field('Make', `<input type="text" id="vehMake" maxlength="30" value="${escapeHtml(v.make || '')}" />`)}
        ${field('Model', `<input type="text" id="vehModel" maxlength="40" value="${escapeHtml(v.model || '')}" />`)}
        ${field('Year', `<input type="number" id="vehYear" min="1950" max="2035" value="${escapeHtml(String(v.year || ''))}" />`)}
        ${field('VIN', `<input type="text" id="vehVin" maxlength="17" value="${escapeHtml(v.vin || '')}" style="text-transform:uppercase" autocomplete="off" spellcheck="false" />`, '17 characters, optional. Specs and recalls load automatically when complete.')}
        ${field('Plate', `<input type="text" id="vehPlate" maxlength="12" value="${escapeHtml(v.plate || '')}" />`)}
        ${field('Fuel type', `<select id="vehFuel">${['Gasoline', 'Diesel', 'Hybrid gasoline', 'Hybrid diesel', 'Electric', 'LPG', 'CNG', 'E85'].map((f) => `<option ${f === v.fuel ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}
        ${field('Tank capacity (L)', `<input type="number" id="vehTank" min="0" max="300" step="0.1" value="${escapeHtml(String(v.tank ?? 55))}" />`)}
        ${field('Odometer (km)', `<input type="number" id="vehOdo" min="0" step="1" value="${escapeHtml(String(v.odometer ?? 0))}" />`)}
      </div>
      ${field('Notes', `<textarea id="vehNotes" maxlength="300" placeholder="Service notes, modifications…">${escapeHtml(v.notes || '')}</textarea>`)}
      <div class="vin-lookup">
        <div class="row between" style="gap:10px;align-items:flex-start">
          <div>
            <b class="small">VIN lookup</b>
            <div class="small muted vin-status" id="vehVinStatus">Enter a VIN to load specs automatically.</div>
          </div>
          <button class="btn btn-sm" type="button" id="vehVinBtn" disabled>${icon('refresh')}<span>Decode VIN</span></button>
        </div>
        <div id="vehVinPreview"></div>
      </div>
      <div class="callout" style="margin-top:14px">${icon('info')}<div>The demo simulator uses the active vehicle's tank capacity and odometer for range and fuel calculations.</div></div>`,
    actions: [
      { label: 'Cancel' },
      {
        label: isEdit ? 'Save changes' : 'Add vehicle',
        kind: 'primary',
        icon: isEdit ? 'check' : 'plus',
        onClick: (apiRef) => {
          const get = (id) => apiRef.body.querySelector(id)?.value ?? '';
          const vin = normalizeVin(get('#vehVin'));
          const sameVin = lookup.specs && lookup.vin === vin;
          const data = {
            name: get('#vehName').trim() || `${get('#vehMake')} ${get('#vehModel')}`.trim() || 'Vehicle',
            make: get('#vehMake').trim(),
            model: get('#vehModel').trim(),
            year: Number(get('#vehYear')) || new Date().getFullYear(),
            vin,
            plate: get('#vehPlate').trim().toUpperCase(),
            fuel: get('#vehFuel'),
            tank: Number(get('#vehTank')) || 0,
            odometer: Number(get('#vehOdo')) || 0,
            notes: get('#vehNotes').trim(),
            vinSpecs: sameVin ? lookup.specs : null,
            vinDecodedAt: sameVin ? (lookup.at || lookup.specs.decodedAt || null) : null,
            vinRecalls: sameVin ? lookup.recalls : [],
            vinRecallsAt: sameVin ? (lookup.recallsAt || null) : null,
          };
          if (!data.make || !data.model) {
            toast('Make and model required', { type: 'warn' });
            return false;
          }
          if (isEdit) updateVehicle({ ...vehicle, ...data });
          else addVehicle(data);
          done();
          toast(isEdit ? 'Vehicle updated' : 'Vehicle added', { message: data.name, type: 'ok' });
        },
      },
    ],
    onMount: (apiRef) => {
      const statusEl = apiRef.body.querySelector('#vehVinStatus');
      const previewEl = apiRef.body.querySelector('#vehVinPreview');
      const vinBtn = apiRef.body.querySelector('#vehVinBtn');
      const vinInput = apiRef.body.querySelector('#vehVin');

      const fill = (id, value, overwrite = false) => {
        const el = apiRef.body.querySelector(id);
        if (!el || value === undefined || value === null || value === '') return;
        if (overwrite || !String(el.value).trim()) el.value = String(value);
      };

      const renderStatus = () => {
        if (!statusEl || !statusEl.isConnected) return;
        const vin = normalizeVin(vinInput?.value || '');
        const fresh = lookup.specs && lookup.vin === vin;
        const specs = fresh ? lookup.specs : null;
        let message = 'Enter a VIN to load specs automatically.';
        let kind = '';

        if (lookup.busy) {
          message = 'Contacting NHTSA for specs and safety recalls…';
          kind = 'info';
        } else if (lookup.error) {
          message = lookup.error;
          kind = 'warn';
        } else if (fresh) {
          const identity = [specs.year, specs.make, specs.model].filter(Boolean).join(' ');
          const recallText = lookup.recallsAt
            ? (lookup.recalls.length
              ? `${lookup.recalls.length} safety campaign${lookup.recalls.length === 1 ? '' : 's'} found.`
              : 'No NHTSA safety campaigns found.')
            : lookup.recallError ? `Recall check failed: ${lookup.recallError}` : '';
          message = [identity && `Decoded ${identity}.`, recallText].filter(Boolean).join(' ');
          kind = lookup.recallError ? 'warn' : 'ok';
        } else if (vin) {
          message = isValidVin(vin) ? 'Ready to decode this VIN.' : `${vin.length}/17 characters.`;
        }

        statusEl.textContent = message;
        statusEl.className = `small vin-status ${kind}`.trim();
        if (vinBtn) vinBtn.disabled = lookup.busy || !isValidVin(vin);

        if (!previewEl) return;
        if (!fresh) {
          previewEl.innerHTML = '';
          return;
        }
        const rows = [
          ['Body', specs.bodyClass],
          ['Engine', [specs.engineModel, specs.displacementL ? `${specs.displacementL} L` : '', specs.engineCylinders ? `${specs.engineCylinders}-cyl` : ''].filter(Boolean).join(' · ')],
          ['Power', [specs.engineHp ? `${specs.engineHp} hp` : '', specs.engineKw ? `${specs.engineKw} kW` : ''].filter(Boolean).join(' · ')],
          ['Fuel', specs.fuelType],
          ['Drive', specs.driveType],
          ['Transmission', [specs.transmissionStyle, specs.transmissionSpeeds ? `${specs.transmissionSpeeds}-speed` : ''].filter(Boolean).join(' · ')],
        ].filter(([, value]) => value);
        previewEl.innerHTML = rows.length
          ? `<div class="vin-preview">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div>`
          : '';
      };

      const runLookup = async () => {
        const vin = normalizeVin(vinInput?.value || '');
        if (!isValidVin(vin)) {
          lookup.error = 'Enter a complete 17-character VIN (letters I, O and Q are not used).';
          renderStatus();
          return;
        }
        if (lookup.busy) return;
        lookup.busy = true;
        lookup.error = '';
        lookup.recallError = '';
        renderStatus();

        try {
          const specs = await decodeVin(vin);
          const sameCar = lookup.vin === vin;
          lookup.specs = specs;
          lookup.vin = vin;
          lookup.at = specs.decodedAt;
          if (!sameCar) {
            lookup.recalls = [];
            lookup.recallsAt = 0;
          }

          const vinChanged = vin !== originalVin;
          const overwrite = !isEdit || vinChanged;
          fill('#vehMake', specs.make, overwrite);
          fill('#vehModel', specs.model, overwrite);
          fill('#vehYear', specs.year, overwrite);
          fill('#vehName', `${specs.make || ''} ${specs.model || ''}`.trim(), false);
          const fuelEl = apiRef.body.querySelector('#vehFuel');
          if (fuelEl && specs.fuelType && overwrite) {
            const match = [...fuelEl.options].find((o) => o.value.toLowerCase() === specs.fuelType.toLowerCase());
            if (match) fuelEl.value = match.value;
          }

          if (specs.make && specs.model && specs.year) {
            try {
              lookup.recalls = await fetchRecalls({ make: specs.make, model: specs.model, year: specs.year });
              lookup.recallsAt = Date.now();
            } catch (err) {
              lookup.recallError = err.message || 'Recall lookup failed.';
            }
          }
        } catch (err) {
          lookup.error = err.message || 'VIN lookup failed.';
        } finally {
          lookup.busy = false;
          renderStatus();
        }
      };

      vinBtn?.addEventListener('click', runLookup);
      vinInput?.addEventListener('input', () => {
        const vin = normalizeVin(vinInput.value);
        lookup.error = '';
        lookup.recallError = '';
        renderStatus();
        clearTimeout(autoTimer);
        if (isValidVin(vin) && vin !== lookup.vin) {
          autoTimer = setTimeout(runLookup, 700);
        }
      });

      apiRef.body.querySelector('#vehPreset')?.addEventListener('change', (e) => {
        const preset = VEHICLE_PRESETS[Number(e.target.value)];
        if (!preset) return;
        apiRef.body.querySelector('#vehName').value = `${preset.make} ${preset.model}`;
        apiRef.body.querySelector('#vehMake').value = preset.make;
        apiRef.body.querySelector('#vehModel').value = preset.model;
        apiRef.body.querySelector('#vehYear').value = String(preset.year);
        apiRef.body.querySelector('#vehVin').value = preset.vin;
        apiRef.body.querySelector('#vehTank').value = String(preset.tank);
        const fuel = apiRef.body.querySelector('#vehFuel');
        [...fuel.options].forEach((o) => { o.selected = o.value === preset.fuel; });
        lookup.error = '';
        lookup.recallError = '';
        renderStatus();
      });

      renderStatus();
    },
    onClose: () => clearTimeout(autoTimer),
  });

  return api;
};
