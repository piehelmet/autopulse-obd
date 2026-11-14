/* AutoPulse OBD2 — dashboard screen */

import { getState, setState, activeVehicle } from '../core/store.js';
import { PIDS, PIDS_BY_KEY, getPid, CORE_KEYS } from '../data/pids.js';
import { allCustomPids } from '../data/custom.js';
import { displayPid, formatDistance, rangeKm, consumption, units } from '../core/display.js';
import { getHistory, lastN } from '../core/history.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState, field } from './components.js';
import { drawGauge, drawLineChart, palette } from './charts.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, uid, clamp } from '../core/utils.js';

const COLORS = () => {
  const p = palette();
  return { rpm: p.accent, speed: p.blue, coolant: p.accent, fuelLevel: p.purple, voltage: p.warn, oilTemp: p.warn, maf: p.blue, map: p.purple };
};

const WIDTHS = [2, 3, 4, 6, 8, 12];
const HEIGHTS = [1, 2, 3];

const unitOf = (pid) => displayPid(pid, 0).unit;

const itemBody = (item, pid) => {
  if (item.type === 'gauge') {
    return `<div class="gauge-wrap"><canvas></canvas>
      <div class="gauge-overlay"><b data-val>—</b><span data-unit>${escapeHtml(unitOf(pid))}</span></div></div>`;
  }
  if (item.type === 'chart') {
    return `<div class="chart-box" style="width:100%;height:100%;min-height:0"><canvas></canvas></div>`;
  }
  if (item.type === 'bar') {
    return `<div class="di-num"><b data-val>—</b><span data-unit>${escapeHtml(unitOf(pid))}</span>
      <div class="progress" style="width:76%;margin-top:9px"><i data-bar style="width:0%"></i></div></div>`;
  }
  return `<div class="di-num"><b data-val>—</b><span data-unit>${escapeHtml(unitOf(pid))}</span><small>${escapeHtml(pid.name)}</small></div>`;
};

const itemHtml = (item, editing) => {
  const pid = getPid(item.pid);
  if (!pid) return '';
  return `<div class="dash-item w${item.w || 3} h${item.h || 2}${editing ? ' editing' : ''}" data-id="${item.id}">
    <div class="di-head">
      <span class="di-title">${escapeHtml(pid.short || pid.name)}</span>
      <div class="di-actions"${editing ? ' style="opacity:1"' : ''}>
        <button type="button" data-act="config" title="Configure widget" aria-label="Configure widget">${icon('sliders')}</button>
        <button type="button" data-act="remove" title="Remove widget" aria-label="Remove widget">${icon('close')}</button>
      </div>
    </div>
    <div class="di-body">${itemBody(item, pid)}</div>
  </div>`;
};

export const render = (view) => {
  let updateValues = () => {};
  let editing = false;
  let disposed = false;

  const build = () => {
    if (disposed) return;
    const s = getState();
    const vehicle = activeVehicle();
    const dash = s.dashboards.find((d) => d.id === s.activeDashboardId) || s.dashboards[0];
    const u = units();

    view.innerHTML = `
      ${pageHead('Dashboard', `Live telemetry · ${vehicle.name}`, `
        <button class="btn btn-sm" id="dashDemoBtn" type="button">${icon('sliders')}<span>Demo drive</span></button>
        <button class="btn btn-sm" id="dashPageBtn" type="button">${icon('plus')}<span>Page</span></button>
        <button class="btn btn-sm btn-primary" id="dashAddBtn" type="button">${icon('plus')}<span>Widget</span></button>
      `)}
      <div class="grid grid-4" style="margin-bottom:14px">
        <div class="kpi">
          <div class="k-label">${icon('map')} Estimated range</div>
          <div class="k-value"><span id="kRange">—</span><small id="kRangeUnit">${u.distance}</small></div>
          <div class="k-foot" id="kRangeFoot">Based on current consumption</div>
        </div>
        <div class="kpi blue">
          <div class="k-label">${icon('fuel')} Fuel level</div>
          <div class="k-value"><span id="kFuel">—</span><small>%</small></div>
          <div class="k-foot" id="kFuelFoot">Tank ${vehicle.tank || 55} L</div>
        </div>
        <div class="kpi warn">
          <div class="k-label">${icon('battery')} Battery</div>
          <div class="k-value"><span id="kBattery">—</span><small>V</small></div>
          <div class="k-foot" id="kBatteryFoot">Charging system</div>
        </div>
        <div class="kpi">
          <div class="k-label">${icon('speed')} Odometer</div>
          <div class="k-value"><span id="kOdo">—</span><small id="kOdoUnit">${u.distance}</small></div>
          <div class="k-foot">${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</div>
        </div>
      </div>

      <div class="dash-toolbar">
        <div class="segmented" id="dashPages">
          ${s.dashboards.map((d) => `<button type="button" data-page="${d.id}" class="${d.id === dash.id ? 'active' : ''}">${escapeHtml(d.name)}</button>`).join('')}
        </div>
        <span class="grow"></span>
        <button class="btn btn-sm ${editing ? 'btn-primary' : ''}" id="dashEditBtn" type="button">${icon('edit')}<span>${editing ? 'Done' : 'Edit'}</span></button>
        <button class="btn btn-sm btn-ghost" id="dashDelPage" type="button" title="Delete current page">${icon('trash')}</button>
      </div>

      ${dash.items.length
        ? `<div class="dash-grid" id="dashGrid">${dash.items.map((it) => itemHtml(it, editing)).join('')}</div>`
        : `<div class="dash-empty">${icon('grid')}<b>This page is empty</b><span class="small">Add a widget to start building your dashboard.</span></div>`}

      <p class="small muted" style="margin-top:14px">
        ${editing
          ? 'Edit mode: use the sliders button on a widget to change its PID, size or visual type.'
          : 'Tip: hover a widget to configure it. Dashboards, layouts and settings are stored on this device.'}
      </p>`;

    updateValues = makeUpdater(view, dash);
    updateValues(connection.values);

    bind(view, dash);

    connection.setExtraPids(allCustomPids());
    connection.setPollKeys([...new Set([...CORE_KEYS, ...dash.items.map((i) => i.pid)])]);
  };

  const bind = (root, dash) => {
    root.querySelector('#dashAddBtn')?.addEventListener('click', () => openWidgetModal(null, refresh));
    root.querySelector('#dashEditBtn')?.addEventListener('click', () => {
      editing = !editing;
      build();
    });
    root.querySelector('#dashPageBtn')?.addEventListener('click', () => addPage(refresh));
    root.querySelector('#dashDelPage')?.addEventListener('click', () => deletePage(dash, refresh));
    root.querySelector('#dashDemoBtn')?.addEventListener('click', openDemoControls);

    root.querySelectorAll('#dashPages [data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setState((st) => { st.activeDashboardId = btn.dataset.page; });
        build();
      });
    });

    root.querySelector('#dashGrid')?.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-act]');
      if (!action) return;
      const itemEl = action.closest('.dash-item');
      const item = dash.items.find((x) => x.id === itemEl?.dataset.id);
      if (!item) return;
      if (action.dataset.act === 'config') openWidgetModal(item, refresh);
      if (action.dataset.act === 'remove') {
        const ok = await confirmDialog({
          title: 'Remove widget?',
          message: 'This only removes the widget from the dashboard. Your vehicle data is not affected.',
          okLabel: 'Remove',
          danger: true,
        });
        if (!ok) return;
        setState((st) => {
          const d = st.dashboards.find((x) => x.id === st.activeDashboardId);
          if (d) d.items = d.items.filter((x) => x.id !== item.id);
        });
        refresh();
      }
    });
  };

  const refresh = () => build();

  const onResize = () => updateValues(connection.values);
  window.addEventListener('resize', onResize);
  window.addEventListener('autopulse:resize', onResize);

  const unsubData = connection.on('data', (values) => updateValues(values));
  const unsubStatus = connection.on('status', () => {
    const pill = document.getElementById('topStatusText');
    if (pill) updateValues(connection.values);
  });

  build();

  return () => {
    disposed = true;
    unsubData();
    unsubStatus();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('autopulse:resize', onResize);
  };
};

const makeUpdater = (root, dash) => {
  const refs = Array.from(root.querySelectorAll('.dash-item')).map((el) => {
    const item = dash.items.find((x) => x.id === el.dataset.id);
    const pid = getPid(item?.pid);
    if (!item || !pid) return null;
    return {
      el, item, pid,
      value: el.querySelector('[data-val]'),
      unit: el.querySelector('[data-unit]'),
      bar: el.querySelector('[data-bar]'),
      canvas: el.querySelector('canvas'),
    };
  }).filter(Boolean);

  const range = (pid) => {
    const a = displayPid(pid, pid.min);
    const b = displayPid(pid, pid.max);
    return { min: a.value ?? pid.min, max: b.value ?? pid.max };
  };

  return (values) => {
    if (!values) return;
    const colors = COLORS();
    const s = getState();

    // KPI cards
    const fuel = values.fuelLevel;
    const cons = consumption(values.fuelRate, values.speed);
    const l100 = cons.value ? (getState().settings.units === 'imperial' ? 235.215 / cons.value : cons.value) : 7.5;
    const rng = rangeKm(fuel, activeVehicle()?.tank || 55, l100);
    setText(root, '#kRange', rng === null ? '—' : formatDistance(rng));
    setText(root, '#kRangeFoot', cons.value ? `${cons.value.toFixed(1)} ${cons.unit} average` : 'Based on 7.5 L/100 km');
    setText(root, '#kFuel', fuel === undefined ? '—' : Math.round(fuel));
    setText(root, '#kBattery', values.voltage === undefined ? '—' : values.voltage.toFixed(2));
    const odo = values.odometer ?? activeVehicle()?.odometer;
    setText(root, '#kOdo', odo === undefined ? '—' : formatDistance(odo));
    setText(root, '#kBatteryFoot', values.voltage && values.voltage > 13.2 ? 'Alternator charging' : 'Engine off or low charge');

    refs.forEach((r) => {
      const raw = values[r.pid.key];
      if (raw === undefined) return;
      const d = displayPid(r.pid, raw);
      if (r.value) r.value.textContent = d.text;
      if (r.unit) r.unit.textContent = d.unit;

      if (r.item.type === 'gauge' && r.canvas) {
        const { min, max } = range(r.pid);
        const opts = {
          value: d.value, min, max, decimals: d.decimals,
          text: d.text, unit: d.unit,
          color: colors[r.pid.key],
          warnAt: r.pid.key === 'coolant' ? displayPid(r.pid, 105).value : undefined,
          dangerAt: r.pid.key === 'coolant' ? displayPid(r.pid, 113).value : r.pid.key === 'voltage' ? displayPid(r.pid, 15.5).value : undefined,
          redline: r.pid.key === 'rpm' ? s.settings.shiftLight : undefined,
        };
        if (r.pid.key === 'fuelLevel' && raw < 15) opts.color = palette().danger;
        drawGauge(r.canvas, opts);
      }

      if (r.item.type === 'chart' && r.canvas) {
        const data = lastN(r.pid.key, 120);
        const { min, max } = range(r.pid);
        drawLineChart(r.canvas, [{ data, color: colors[r.pid.key] || palette().accent }], {
          min, max, fill: true, xLabels: ['-30 s', 'now'],
        });
      }

      if (r.bar) {
        const { min, max } = range(r.pid);
        const pct = clamp(((d.value - min) / (max - min || 1)) * 100, 0, 100);
        r.bar.style.width = `${pct}%`;
      }
    });
  };
};

const setText = (root, sel, text) => {
  const el = root.querySelector(sel);
  if (el) el.textContent = text;
};

const openWidgetModal = (existing, done) => {
  const s = getState();
  const dash = s.dashboards.find((d) => d.id === s.activeDashboardId);
  const item = existing || { id: uid('it'), pid: 'rpm', type: 'gauge', w: 3, h: 2 };

  modal({
    title: existing ? 'Configure widget' : 'Add widget',
    subtitle: dash ? `Page: ${dash.name}` : '',
    body: `
      <div class="form-grid">
        ${field('Parameter', `<select id="wPid">${PIDS.map((p) => `<option value="${p.key}" ${p.key === item.pid ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.unit)})</option>`).join('')}</select>`)}
        ${field('Display type', `<select id="wType">
          <option value="gauge" ${item.type === 'gauge' ? 'selected' : ''}>Gauge</option>
          <option value="num" ${item.type === 'num' ? 'selected' : ''}>Large number</option>
          <option value="bar" ${item.type === 'bar' ? 'selected' : ''}>Bar</option>
          <option value="chart" ${item.type === 'chart' ? 'selected' : ''}>Line chart</option>
        </select>`)}
        ${field('Width', `<select id="wW">${WIDTHS.map((w) => `<option value="${w}" ${w === item.w ? 'selected' : ''}>${w} / 12 columns</option>`).join('')}</select>`)}
        ${field('Height', `<select id="wH">${HEIGHTS.map((h) => `<option value="${h}" ${h === item.h ? 'selected' : ''}>${h} row${h > 1 ? 's' : ''}</option>`).join('')}</select>`)}
      </div>
      <div class="callout" style="margin-top:14px">${icon('info')}<div>Widgets update live while the adapter is connected. Charts keep the last 30 seconds of data.</div></div>`,
    actions: [
      { label: 'Cancel' },
      {
        label: existing ? 'Save widget' : 'Add widget',
        kind: 'primary',
        icon: existing ? 'check' : 'plus',
        onClick: (api) => {
          const pid = api.body.querySelector('#wPid').value;
          const type = api.body.querySelector('#wType').value;
          const w = Number(api.body.querySelector('#wW').value);
          const h = Number(api.body.querySelector('#wH').value);
          setState((st) => {
            const d = st.dashboards.find((x) => x.id === st.activeDashboardId);
            if (!d) return;
            if (existing) {
              const target = d.items.find((x) => x.id === existing.id);
              if (target) Object.assign(target, { pid, type, w, h });
            } else {
              d.items.push({ id: uid('it'), pid, type, w, h });
            }
          });
          done();
          toast(existing ? 'Widget updated' : 'Widget added', { type: 'ok' });
        },
      },
    ],
  });
};

const addPage = (done) => {
  modal({
    title: 'New dashboard page',
    narrow: true,
    body: field('Page name', '<input type="text" id="pageName" maxlength="24" placeholder="e.g. Track day" value="New page" />'),
    actions: [
      { label: 'Cancel' },
      {
        label: 'Create page',
        kind: 'primary',
        icon: 'plus',
        onClick: (api) => {
          const name = api.body.querySelector('#pageName').value.trim() || 'New page';
          const id = uid('dash');
          setState((st) => {
            st.dashboards.push({ id, name, items: [] });
            st.activeDashboardId = id;
          });
          done();
          toast('Page created', { message: name, type: 'ok' });
        },
      },
    ],
  });
};

const deletePage = async (dash, done) => {
  const s = getState();
  if (s.dashboards.length <= 1) {
    toast('Cannot delete the last page', { message: 'Create another dashboard page first.', type: 'warn' });
    return;
  }
  const ok = await confirmDialog({
    title: `Delete “${dash.name}”?`,
    message: 'The widgets on this page will be removed. Other pages are not affected.',
    okLabel: 'Delete page',
    danger: true,
    iconName: 'trash',
  });
  if (!ok) return;
  setState((st) => {
    st.dashboards = st.dashboards.filter((d) => d.id !== dash.id);
    if (!st.dashboards.some((d) => d.id === st.activeDashboardId)) st.activeDashboardId = st.dashboards[0].id;
  });
  done();
  toast('Page deleted', { type: 'ok' });
};

const openDemoControls = () => {
  if (connection.mode !== 'demo') {
    toast('Demo controls unavailable', { message: 'Connect to the demo vehicle to use the driving simulator.', type: 'warn' });
    return;
  }
  const sim = connection.sim;
  modal({
    title: 'Demo drive',
    subtitle: 'Take control of the simulated vehicle',
    narrow: true,
    body: `
      <label class="switch" style="margin-bottom:16px">
        <input type="checkbox" id="demoAuto" ${sim?.auto ? 'checked' : ''} />
        <span class="track"></span><span class="sw-label">Automatic drive cycle</span>
      </label>
      ${field('Throttle', `<input type="range" id="demoThrottle" min="0" max="100" step="1" value="${Math.round(sim?.throttleInput || 0)}" />`)}
      <div class="row between small muted" style="margin:-4px 0 12px"><span>0 %</span><span id="demoThrottleVal">${Math.round(sim?.throttleInput || 0)} %</span><span>100 %</span></div>
      ${field('Brake', `<input type="range" id="demoBrake" min="0" max="100" step="1" value="${Math.round(sim?.brakeInput || 0)}" />`)}
      <div class="row between small muted" style="margin:-4px 0 12px"><span>0 %</span><span id="demoBrakeVal">${Math.round(sim?.brakeInput || 0)} %</span><span>100 %</span></div>
      <div class="callout">${icon('info')}<div>Moving a slider switches the simulator to manual control. Re-enable automatic drive to let it cruise through a mixed city/highway cycle.</div></div>`,
    onMount: (api) => {
      const auto = api.body.querySelector('#demoAuto');
      const th = api.body.querySelector('#demoThrottle');
      const br = api.body.querySelector('#demoBrake');
      const thv = api.body.querySelector('#demoThrottleVal');
      const brv = api.body.querySelector('#demoBrakeVal');
      auto.addEventListener('change', () => connection.setDemoAuto(auto.checked));
      th.addEventListener('input', () => {
        auto.checked = false;
        connection.setDemoAuto(false);
        connection.setDemoThrottle(Number(th.value));
        thv.textContent = `${th.value} %`;
      });
      br.addEventListener('input', () => {
        auto.checked = false;
        connection.setDemoAuto(false);
        connection.setDemoBrake(Number(br.value));
        brv.textContent = `${br.value} %`;
      });
    },
    actions: [{ label: 'Done', kind: 'primary' }],
  });
};
