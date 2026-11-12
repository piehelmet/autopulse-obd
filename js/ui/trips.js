/* AutoPulse OBD2 — trip computer screen */

import { getState, removeTrip, activeVehicle } from '../core/store.js';
import { trip, startTrip, stopTrip, liveTrip } from '../core/trips.js';
import { displayPid, formatDistance, formatSpeed, formatVolume, formatMoney, consumption, units } from '../core/display.js';
import { PIDS_BY_KEY } from '../data/pids.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState } from './components.js';
import { drawLineChart, palette } from './charts.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, fmtTime, fmtDate, fmtStopwatch } from '../core/utils.js';

export const render = (view) => {
  let updateLive = () => {};
  let wasActive = trip.active;

  const build = () => {
    const s = getState();
    const u = units();
    const trips = s.trips || [];
    const totalDistance = trips.reduce((a, t) => a + (t.distanceKm || 0), 0);
    const totalFuel = trips.reduce((a, t) => a + (t.fuelUsedL || 0), 0);
    const totalCost = trips.reduce((a, t) => a + (t.cost || 0), 0);
    const avgCons = totalDistance > 0.1 ? (totalFuel / totalDistance) * 100 : null;

    view.innerHTML = `
      ${pageHead('Trips', 'Automatic trip logging with distance, fuel, cost and driving statistics.', `
        ${trip.active
          ? `<button class="btn btn-sm btn-danger" id="tripStopBtn" type="button">${icon('stop')}<span>Stop trip</span></button>`
          : `<button class="btn btn-sm btn-primary" id="tripStartBtn" type="button">${icon('play')}<span>Start trip</span></button>`}
      `)}

      <div class="grid grid-4" style="margin-bottom:14px">
        <div class="kpi"><div class="k-label">${icon('route')} Total distance</div><div class="k-value"><span>${formatDistance(totalDistance)}</span><small>${u.distance}</small></div><div class="k-foot">${trips.length} saved trip${trips.length === 1 ? '' : 's'}</div></div>
        <div class="kpi blue"><div class="k-label">${icon('fuel')} Fuel used</div><div class="k-value"><span>${formatVolume(totalFuel, 1)}</span><small>${u.volume}</small></div><div class="k-foot">Across all trips</div></div>
        <div class="kpi warn"><div class="k-label">${icon('award')} Fuel cost</div><div class="k-value"><span>${formatMoney(totalCost, s.settings.currency)}</span></div><div class="k-foot">At ${formatMoney(s.settings.fuelPrice, s.settings.currency)}/${u.volume}</div></div>
        <div class="kpi"><div class="k-label">${icon('activity')} Average consumption</div><div class="k-value"><span>${avgCons === null ? '—' : (s.settings.units === 'imperial' ? (235.215 / avgCons).toFixed(1) : avgCons.toFixed(1))}</span><small>${u.consumption}</small></div><div class="k-foot">${trips.length ? 'Based on recorded fuel rate' : 'No trips yet'}</div></div>
      </div>

      <div class="card ${trip.active ? 'glow' : ''}" id="liveTripCard" style="margin-bottom:16px">
        ${trip.active ? `
          <div class="card-head">
            <div>
              <h3>${icon('route')} Recording trip ${trip.auto ? '<span class="chip accent" style="margin-left:6px">Auto</span>' : ''}</h3>
              <div class="sub">${escapeHtml(trip.vehicleName)} · started ${fmtDate(trip.startedAt)}</div>
            </div>
            <button class="btn btn-sm btn-danger" id="tripStopBtn2" type="button">${icon('stop')}<span>Stop</span></button>
          </div>
          <div class="perf-result" id="liveTripStats">
            <div><b data-live="distance">0.00</b><span>Distance · ${u.distance}</span></div>
            <div><b data-live="duration">0:00</b><span>Duration</span></div>
            <div><b data-live="avg">0</b><span>Avg · ${u.speed}</span></div>
            <div><b data-live="max">0</b><span>Max · ${u.speed}</span></div>
            <div><b data-live="fuel">0.00</b><span>Fuel · ${u.volume}</span></div>
            <div><b data-live="cons">—</b><span>${u.consumption}</span></div>
            <div><b data-live="cost">—</b><span>Cost</span></div>
            <div><b data-live="idle">0:00</b><span>Idle time</span></div>
          </div>` : `
          <div class="between" style="flex-wrap:wrap;gap:12px">
            <div>
              <h3 style="font-size:14.5px">${icon('route')} No active trip</h3>
              <p class="small muted" style="margin-top:5px">Start a trip manually, or enable automatic trip recording in Settings to log every drive.</p>
            </div>
            <button class="btn btn-sm btn-primary" id="tripStartBtn2" type="button">${icon('play')}<span>Start trip</span></button>
          </div>`}
      </div>

      <div class="between" style="margin-bottom:10px">
        <h3 style="font-size:14px">Trip history</h3>
        <span class="chip info">${trips.length} trip${trips.length === 1 ? '' : 's'}</span>
      </div>
      <div class="trip-list" id="tripList">
        ${trips.length ? trips.map((t) => tripCard(t)).join('') : emptyState('route', 'No trips recorded yet', 'Trips are stored on this device. Start one above or enable auto recording.')}
      </div>`;

    bind();
    updateLive = makeLiveUpdater(view);
    updateLive(connection.values);
  };

  const bind = () => {
    view.querySelectorAll('#tripStartBtn, #tripStartBtn2').forEach((b) => b.addEventListener('click', () => {
      if (connection.status !== 'connected') {
        toast('Not connected', { message: 'Connect to the demo vehicle or an adapter first.', type: 'warn' });
        return;
      }
      startTrip({ auto: false });
      wasActive = true;
      toast('Trip started', { message: 'Recording distance, fuel and driving stats.', type: 'ok' });
      build();
    }));
    view.querySelectorAll('#tripStopBtn, #tripStopBtn2').forEach((b) => b.addEventListener('click', () => {
      const result = stopTrip();
      wasActive = false;
      if (result) {
        toast('Trip saved', {
          message: `${formatDistance(result.distanceKm)} ${units().distance} · ${formatVolume(result.fuelUsedL)} ${units().volume}`,
          type: 'ok',
        });
      }
      build();
    }));

    view.querySelector('#tripList')?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-trip]');
      if (!card) return;
      const t = getState().trips.find((x) => x.id === card.dataset.trip);
      if (t) openTrip(t, build);
    });
  };

  const onData = (values) => {
    if (wasActive && !trip.active) {
      wasActive = false;
      build();
      return;
    }
    if (trip.active) updateLive(values);
  };
  const unsub = connection.on('data', onData);

  build();
  return () => unsub();
};

const makeLiveUpdater = (root) => (values) => {
  if (!trip.active) return;
  const u = units();
  const live = liveTrip();
  const set = (key, text) => {
    const el = root.querySelector(`[data-live="${key}"]`);
    if (el) el.textContent = text;
  };
  set('distance', formatDistance(live.distanceKm, 2));
  set('duration', fmtTime(live.duration));
  set('avg', formatSpeed(live.avgSpeedKmh));
  set('max', formatSpeed(live.maxSpeedKmh));
  set('fuel', formatVolume(live.fuelUsedL, 2));
  const cons = live.avgConsumption;
  set('cons', cons === null ? '—' : (getState().settings.units === 'imperial' ? (235.215 / cons).toFixed(1) : cons.toFixed(1)));
  set('cost', formatMoney(live.cost, getState().settings.currency));
  set('idle', fmtTime(live.idleSeconds));
};

const tripCard = (t) => {
  const u = units();
  const cons = t.avgConsumption;
  const consText = cons === null || cons === undefined
    ? '—'
    : (getState().settings.units === 'imperial' ? (235.215 / cons).toFixed(1) : cons.toFixed(1));
  return `<div class="trip-card" data-trip="${t.id}">
    <div class="trip-icon">${icon('route')}</div>
    <div>
      <div class="trip-title">${escapeHtml(fmtDate(t.startedAt))}</div>
      <div class="trip-meta">
        <span>${escapeHtml(t.vehicleName || 'Vehicle')}</span>
        <span>${fmtTime(t.duration)}</span>
        <span>${formatSpeed(t.avgSpeedKmh)} ${u.speed} avg</span>
      </div>
    </div>
    <div class="trip-stats">
      <div><b>${formatDistance(t.distanceKm, 1)}</b><span>${u.distance}</span></div>
      <div><b>${consText}</b><span>${u.consumption}</span></div>
      <div><b>${formatMoney(t.cost || 0, getState().settings.currency)}</b><span>Cost</span></div>
    </div>
  </div>`;
};

const openTrip = (t, done) => {
  const u = units();
  const cons = t.avgConsumption;
  const consText = cons === null || cons === undefined
    ? '—'
    : (getState().settings.units === 'imperial' ? (235.215 / cons).toFixed(1) : cons.toFixed(1));
  const samples = t.samples || { t: [], speed: [], fuel: [] };
  const minutes = Math.max(1, Math.round((t.duration || 0) / 60));

  const api = modal({
    title: fmtDate(t.startedAt),
    subtitle: `${t.vehicleName || 'Vehicle'} · ${fmtTime(t.duration)}`,
    wide: true,
    body: `
      <div class="perf-result" style="margin-bottom:16px">
        <div><b>${formatDistance(t.distanceKm, 2)}</b><span>Distance · ${u.distance}</span></div>
        <div><b>${fmtTime(t.duration)}</b><span>Duration</span></div>
        <div><b>${formatSpeed(t.avgSpeedKmh)}</b><span>Avg · ${u.speed}</span></div>
        <div><b>${formatSpeed(t.maxSpeedKmh)}</b><span>Max · ${u.speed}</span></div>
        <div><b>${formatVolume(t.fuelUsedL, 2)}</b><span>Fuel · ${u.volume}</span></div>
        <div><b>${consText}</b><span>${u.consumption}</span></div>
        <div><b>${formatMoney(t.cost || 0, getState().settings.currency)}</b><span>Fuel cost</span></div>
        <div><b>${fmtTime(t.idleSeconds || 0)}</b><span>Idle time</span></div>
      </div>
      <div class="grid grid-2">
        <div class="card flat">
          <div class="card-head"><h3>${icon('speed')} Speed</h3><span class="tiny muted">${u.speed}</span></div>
          <div class="chart-box" style="height:180px;min-height:180px"><canvas id="tripSpeedChart"></canvas></div>
        </div>
        <div class="card flat">
          <div class="card-head"><h3>${icon('fuel')} Fuel rate</h3><span class="tiny muted">${u.fuelRate}</span></div>
          <div class="chart-box" style="height:180px;min-height:180px"><canvas id="tripFuelChart"></canvas></div>
        </div>
      </div>
      <div class="callout" style="margin-top:14px">${icon('info')}<div>Fuel figures are derived from the ECU fuel-rate PID. Tank-to-tank measurement is more accurate if your vehicle does not report fuel rate.</div></div>`,
    actions: [
      {
        label: 'Delete trip', kind: 'danger', icon: 'trash', close: false,
        onClick: async (m) => {
          const ok = await confirmDialog({
            title: 'Delete this trip?',
            message: 'The recorded trip and its charts will be removed from this device.',
            okLabel: 'Delete', danger: true,
          });
          if (!ok) return false;
          removeTrip(t.id);
          m.close();
          done();
          toast('Trip deleted', { type: 'ok' });
          return false;
        },
      },
      { label: 'Close', kind: 'primary' },
    ],
    onMount: () => {
      setTimeout(() => {
        const sc = document.getElementById('tripSpeedChart');
        const fc = document.getElementById('tripFuelChart');
        if (sc) drawLineChart(sc, [{ data: samples.speed || [], color: palette().blue }], { fill: true, xLabels: ['start', `${minutes} min`] });
        if (fc) drawLineChart(fc, [{ data: samples.fuel || [], color: palette().accent }], { fill: true, xLabels: ['start', `${minutes} min`] });
      }, 60);
    },
  });
  return api;
};
