/* AutoPulse OBD2 — garage / vehicle profiles */

import { getState, addVehicle, updateVehicle, removeVehicle, setActiveVehicle, activeVehicle } from '../core/store.js';
import { VEHICLE_PRESETS } from '../data/vehicles.js';
import { formatDistance, formatVolume, units } from '../core/display.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState, field } from './components.js';
import { escapeHtml, fmtDate, uid } from '../core/utils.js';

export const render = (view) => {
  const build = () => {
    const s = getState();
    const active = activeVehicle();
    const u = units();

    view.innerHTML = `
      ${pageHead('Garage', 'Vehicle profiles keep VIN, tank size and trip statistics separate for each car.', `
        <button class="btn btn-sm btn-primary" id="garageAddBtn" type="button">${icon('plus')}<span>Add vehicle</span></button>
      `)}
      <div class="grid grid-3">
        ${s.vehicles.map((v) => {
          const trips = s.trips.filter((t) => t.vehicleId === v.id);
          const distance = trips.reduce((a, t) => a + (t.distanceKm || 0), 0);
          const isActive = v.id === s.activeVehicleId;
          return `<div class="card ${isActive ? 'glow' : ''}" style="border-color:${isActive ? 'rgba(var(--accent-rgb),.4)' : 'var(--line)'}">
            <div class="card-head">
              <div>
                <h3>${icon('car')} ${escapeHtml(v.name || `${v.make} ${v.model}`)}</h3>
                <div class="sub">${escapeHtml(String(v.year || ''))} ${escapeHtml(v.make || '')} ${escapeHtml(v.model || '')}</div>
              </div>
              ${isActive ? '<span class="chip accent">Active</span>' : ''}
            </div>
            <div class="stack" style="gap:0">
              <div class="kv"><span class="k">VIN</span><span class="v mono" style="font-size:11px">${escapeHtml(v.vin || '—')}</span></div>
              <div class="kv"><span class="k">Plate</span><span class="v">${escapeHtml(v.plate || '—')}</span></div>
              <div class="kv"><span class="k">Fuel</span><span class="v">${escapeHtml(v.fuel || '—')}</span></div>
              <div class="kv"><span class="k">Tank</span><span class="v">${formatVolume(v.tank || 0, 1)} ${u.volume}</span></div>
              <div class="kv"><span class="k">Odometer</span><span class="v">${formatDistance(v.odometer || 0)} ${u.distance}</span></div>
              <div class="kv"><span class="k">Recorded trips</span><span class="v">${trips.length} · ${formatDistance(distance)} ${u.distance}</span></div>
            </div>
            ${v.notes ? `<p class="small muted" style="margin-top:10px">${escapeHtml(v.notes)}</p>` : ''}
            <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">
              ${isActive ? '<span class="chip ok">Selected for connection</span>' : `<button class="btn btn-sm" type="button" data-select="${v.id}">${icon('check')}<span>Select</span></button>`}
              <button class="btn btn-sm" type="button" data-edit="${v.id}">${icon('edit')}<span>Edit</span></button>
              <button class="btn btn-sm btn-ghost" type="button" data-delete="${v.id}" ${s.vehicles.length <= 1 ? 'disabled' : ''}>${icon('trash')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="card flat" style="margin-top:16px">
        <div class="card-head"><h3>${icon('info')} Active vehicle</h3></div>
        <div class="grid grid-2">
          <div>
            <div class="kv"><span class="k">Profile</span><span class="v">${escapeHtml(active?.name || '—')}</span></div>
            <div class="kv"><span class="k">VIN</span><span class="v mono" style="font-size:11px">${escapeHtml(active?.vin || '—')}</span></div>
            <div class="kv"><span class="k">Fuel type</span><span class="v">${escapeHtml(active?.fuel || '—')}</span></div>
          </div>
          <div>
            <div class="kv"><span class="k">Tank capacity</span><span class="v">${formatVolume(active?.tank || 0, 1)} ${u.volume}</span></div>
            <div class="kv"><span class="k">Odometer</span><span class="v">${formatDistance(active?.odometer || 0)} ${u.distance}</span></div>
            <div class="kv"><span class="k">Added</span><span class="v">${escapeHtml(fmtDate(active?.createdAt, false))}</span></div>
          </div>
        </div>
      </div>

      <div class="callout" style="margin-top:14px">${icon('shield')}<div>Vehicle profiles are stored locally in this browser. Nothing is uploaded. Use Export in Settings to back them up.</div></div>`;

    bind();
  };

  const bind = () => {
    view.querySelector('#garageAddBtn')?.addEventListener('click', () => openVehicleModal(null, build));
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

  modal({
    title: isEdit ? 'Edit vehicle' : 'Add vehicle',
    subtitle: 'Details are used for fuel calculations and trip statistics.',
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
        ${field('VIN', `<input type="text" id="vehVin" maxlength="17" value="${escapeHtml(v.vin || '')}" style="text-transform:uppercase" />`, '17 characters, optional.')}
        ${field('Plate', `<input type="text" id="vehPlate" maxlength="12" value="${escapeHtml(v.plate || '')}" />`)}
        ${field('Fuel type', `<select id="vehFuel">${['Gasoline', 'Diesel', 'Hybrid gasoline', 'Hybrid diesel', 'Electric', 'LPG', 'CNG', 'E85'].map((f) => `<option ${f === v.fuel ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}
        ${field('Tank capacity (L)', `<input type="number" id="vehTank" min="0" max="300" step="0.1" value="${escapeHtml(String(v.tank ?? 55))}" />`)}
        ${field('Odometer (km)', `<input type="number" id="vehOdo" min="0" step="1" value="${escapeHtml(String(v.odometer ?? 0))}" />`)}
      </div>
      ${field('Notes', `<textarea id="vehNotes" maxlength="300" placeholder="Service notes, modifications…">${escapeHtml(v.notes || '')}</textarea>`)}
      <div class="callout" style="margin-top:14px">${icon('info')}<div>The demo simulator uses the active vehicle's tank capacity and odometer for range and fuel calculations.</div></div>`,
    actions: [
      { label: 'Cancel' },
      {
        label: isEdit ? 'Save changes' : 'Add vehicle',
        kind: 'primary',
        icon: isEdit ? 'check' : 'plus',
        onClick: (api) => {
          const get = (id) => api.body.querySelector(id)?.value ?? '';
          const data = {
            name: get('#vehName').trim() || `${get('#vehMake')} ${get('#vehModel')}`.trim() || 'Vehicle',
            make: get('#vehMake').trim(),
            model: get('#vehModel').trim(),
            year: Number(get('#vehYear')) || new Date().getFullYear(),
            vin: get('#vehVin').trim().toUpperCase(),
            plate: get('#vehPlate').trim().toUpperCase(),
            fuel: get('#vehFuel'),
            tank: Number(get('#vehTank')) || 0,
            odometer: Number(get('#vehOdo')) || 0,
            notes: get('#vehNotes').trim(),
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
    onMount: (api) => {
      api.body.querySelector('#vehPreset')?.addEventListener('change', (e) => {
        const preset = VEHICLE_PRESETS[Number(e.target.value)];
        if (!preset) return;
        api.body.querySelector('#vehName').value = `${preset.make} ${preset.model}`;
        api.body.querySelector('#vehMake').value = preset.make;
        api.body.querySelector('#vehModel').value = preset.model;
        api.body.querySelector('#vehYear').value = String(preset.year);
        api.body.querySelector('#vehVin').value = preset.vin;
        api.body.querySelector('#vehTank').value = String(preset.tank);
        const fuel = api.body.querySelector('#vehFuel');
        [...fuel.options].forEach((o) => { o.selected = o.value === preset.fuel; });
      });
    },
  });
};
