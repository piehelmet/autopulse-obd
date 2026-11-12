/* AutoPulse OBD2 — live data / all sensors screen */

import { getState, setState, toggleFavorite, activeVehicle } from '../core/store.js';
import { PIDS, PIDS_BY_KEY, PID_CATEGORIES, CORE_KEYS } from '../data/pids.js';
import { allCustomPids, customToPid } from '../data/custom.js';
import { displayPid } from '../core/display.js';
import { lastN } from '../core/history.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState, field } from './components.js';
import { drawSparkline, palette } from './charts.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, uid, evalFormula } from '../core/utils.js';

export const render = (view) => {
  let search = '';
  let filter = 'all';
  let category = 'All';
  let paused = false;
  let updateRows = () => {};

  const allPids = () => [...PIDS, ...allCustomPids()];

  const build = () => {
    const s = getState();
    const list = allPids();
    const favs = new Set(s.favorites);

    view.innerHTML = `
      ${pageHead('Live data', 'Every sensor the ECU exposes — streamed from the adapter in real time.', `
        <button class="btn btn-sm" id="liveCustomBtn" type="button">${icon('plus')}<span>Custom PID</span></button>
        <button class="btn btn-sm" id="livePauseBtn" type="button">${icon(paused ? 'play' : 'stop')}<span>${paused ? 'Resume' : 'Pause'}</span></button>
      `)}
      <div class="sensor-toolbar">
        <div class="search">${icon('search')}<input type="search" id="sensorSearch" placeholder="Search sensors, PIDs, units…" value="${escapeHtml(search)}" /></div>
        <div class="segmented" id="liveFilter">
          <button type="button" data-filter="all" class="${filter === 'all' ? 'active' : ''}">All</button>
          <button type="button" data-filter="fav" class="${filter === 'fav' ? 'active' : ''}">Favorites</button>
        </div>
        <select id="sensorCat" style="max-width:180px">
          <option value="All">All categories</option>
          ${PID_CATEGORIES.map((c) => `<option value="${c}" ${category === c ? 'selected' : ''}>${c}</option>`).join('')}
          <option value="Custom" ${category === 'Custom' ? 'selected' : ''}>Custom</option>
        </select>
        <span class="chip info" id="sensorCount">${list.length} sensors</span>
      </div>

      <div class="sensor-head">
        <span>Parameter</span><span>Category</span><span style="text-align:right">Value</span><span>Unit</span><span>Trend</span><span></span>
      </div>
      <div class="sensor-list" id="sensorList"></div>
      <div class="callout" style="margin-top:14px">${icon('info')}<div>
        On a real adapter not every PID is supported by every ECU. Unsupported sensors keep their last value or show “—”. Custom PIDs use Mode 22 by default and can be edited or deleted by clicking their name.
      </div></div>`;

    renderList();
    bind();
    connection.setExtraPids(allCustomPids());
    connection.setPollKeys(allPids().map((p) => p.key));
    updateRows(connection.values);
  };

  const filtered = () => {
    const s = getState();
    const favs = new Set(s.favorites);
    const q = search.trim().toLowerCase();
    return allPids().filter((p) => {
      if (filter === 'fav' && !favs.has(p.key)) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return `${p.name} ${p.short} ${p.pid} ${p.unit} ${p.category}`.toLowerCase().includes(q);
    });
  };

  const renderList = () => {
    const listEl = view.querySelector('#sensorList');
    const rows = filtered();
    const countEl = view.querySelector('#sensorCount');
    if (countEl) countEl.textContent = `${rows.length} sensor${rows.length === 1 ? '' : 's'}`;
    if (!rows.length) {
      listEl.innerHTML = emptyState('search', 'No matching sensors', 'Try a different search term or category.');
      updateRows = () => {};
      return;
    }
    listEl.innerHTML = rows.map((p) => `
      <div class="sensor-row" data-key="${p.key}">
        <div>
          <div class="s-name" data-detail title="Sensor details">${escapeHtml(p.name)}</div>
          <div class="tiny muted">${p.custom ? 'Custom PID' : `Mode ${p.mode} · PID ${p.pid}`}</div>
        </div>
        <div class="s-cat">${escapeHtml(p.category)}</div>
        <div class="s-val" data-val>—</div>
        <div class="s-unit" data-unit>${escapeHtml(displayPid(p, 0).unit)}</div>
        <div class="s-spark"><canvas></canvas></div>
        <button class="s-add" type="button" data-add title="Add to dashboard" aria-label="Add to dashboard">${icon('plus')}</button>
      </div>`).join('');

    const refs = rows.map((pid) => {
      const el = listEl.querySelector(`[data-key="${pid.key}"]`);
      return {
        pid,
        val: el?.querySelector('[data-val]'),
        unit: el?.querySelector('[data-unit]'),
        canvas: el?.querySelector('canvas'),
      };
    });
    let frame = 0;
    updateRows = (values) => {
      if (paused || !values) return;
      frame += 1;
      const colors = palette();
      refs.forEach((r) => {
        const raw = values[r.pid.key];
        const d = displayPid(r.pid, raw);
        if (r.val) r.val.textContent = d.text;
        if (r.unit) r.unit.textContent = d.unit;
        if (r.canvas && frame % 2 === 0) {
          const color = r.pid.custom ? colors.purple : r.pid.category === 'Temperature' ? colors.warn : colors.accent;
          drawSparkline(r.canvas, lastN(r.pid.key, 70), color);
        }
      });
    };
  };

  const bind = () => {
    view.querySelector('#sensorSearch')?.addEventListener('input', (e) => {
      search = e.target.value;
      renderList();
    });
    view.querySelector('#sensorCat')?.addEventListener('change', (e) => {
      category = e.target.value;
      renderList();
    });
    view.querySelectorAll('#liveFilter [data-filter]').forEach((b) => {
      b.addEventListener('click', () => {
        filter = b.dataset.filter;
        view.querySelectorAll('#liveFilter [data-filter]').forEach((x) => x.classList.toggle('active', x === b));
        renderList();
      });
    });
    view.querySelector('#livePauseBtn')?.addEventListener('click', () => {
      paused = !paused;
      build();
    });
    view.querySelector('#liveCustomBtn')?.addEventListener('click', () => openCustomPid(() => build()));

    view.querySelector('#sensorList')?.addEventListener('click', (e) => {
      const row = e.target.closest('.sensor-row');
      if (!row) return;
      const pid = allPids().find((p) => p.key === row.dataset.key);
      if (!pid) return;
      if (e.target.closest('[data-add]')) {
        addToDashboard(pid);
        return;
      }
      if (e.target.closest('[data-detail]')) openPidDetail(pid, () => build());
    });
  };

  const onResize = () => updateRows(connection.values);
  window.addEventListener('resize', onResize);
  const unsubData = connection.on('data', (values) => updateRows(values));

  build();

  return () => {
    window.removeEventListener('resize', onResize);
    unsubData();
    connection.setPollKeys(CORE_KEYS);
    connection.setExtraPids([]);
  };
};

const addToDashboard = (pid) => {
  const s = getState();
  const dash = s.dashboards.find((d) => d.id === s.activeDashboardId);
  if (!dash) return;
  if (dash.items.some((i) => i.pid === pid.key)) {
    toast('Already on dashboard', { message: `${pid.name} is already a widget on this page.`, type: 'warn' });
    return;
  }
  setState((st) => {
    const d = st.dashboards.find((x) => x.id === st.activeDashboardId);
    d.items.push({ id: uid('it'), pid: pid.key, type: 'gauge', w: 3, h: 2 });
  });
  toast('Added to dashboard', { message: pid.name, type: 'ok' });
};

const openPidDetail = (pid, done) => {
  const s = getState();
  const fav = s.favorites.includes(pid.key);
  const current = connection.values[pid.key];
  const d = displayPid(pid, current);
  const actions = [];
  if (pid.custom) {
    actions.push({
      label: 'Delete', kind: 'danger', icon: 'trash', close: false,
      onClick: async (api) => {
        const ok = await confirmDialog({
          title: 'Delete custom PID?',
          message: `“${pid.name}” will be removed from this device.`,
          okLabel: 'Delete', danger: true,
        });
        if (!ok) return false;
        setState((st) => { st.customPids = st.customPids.filter((c) => `custom_${c.id}` !== pid.key); });
        api.close();
        done();
        toast('Custom PID deleted', { type: 'ok' });
        return false;
      },
    });
  }
  actions.push({
    label: fav ? 'Remove favorite' : 'Add favorite', icon: 'star', close: false,
    onClick: (api) => {
      toggleFavorite(pid.key);
      api.close();
      done();
      return false;
    },
  });
  actions.push({
    label: 'Add to dashboard', kind: 'primary', icon: 'plus',
    onClick: () => addToDashboard(pid),
  });

  modal({
    title: pid.name,
    subtitle: pid.custom ? 'User-defined PID' : `Mode ${pid.mode} · PID ${pid.pid}`,
    narrow: true,
    body: `
      <div class="stack">
        <div class="kv"><span class="k">Current value</span><span class="v">${d.text} ${escapeHtml(d.unit)}</span></div>
        <div class="kv"><span class="k">Category</span><span class="v">${escapeHtml(pid.category)}</span></div>
        <div class="kv"><span class="k">Range</span><span class="v">${pid.min} – ${pid.max} ${escapeHtml(pid.unit)}</span></div>
        ${pid.custom ? `<div class="kv"><span class="k">Formula</span><span class="v mono">${escapeHtml(pid.formula || '')}</span></div>` : ''}
        <div class="callout">${icon('info')}<div>${pid.custom
          ? 'The formula is evaluated with response bytes A, B, C and D. Edit or delete this PID from the Live data screen.'
          : 'Values are requested directly from the ECU using the standard OBD-II request. Availability depends on the vehicle.'}</div></div>
      </div>`,
    actions,
  });
};

const openCustomPid = (done) => {
  modal({
    title: 'Custom PID',
    subtitle: 'Define a Mode 01 or Mode 22 parameter',
    body: `
      <div class="form-grid">
        ${field('Name', '<input type="text" id="cpName" maxlength="40" placeholder="e.g. Boost pressure" />')}
        ${field('Unit', '<input type="text" id="cpUnit" maxlength="10" placeholder="bar" />')}
        ${field('Mode', '<select id="cpMode"><option value="22">22 — manufacturer</option><option value="01">01 — standard</option></select>')}
        ${field('PID (hex)', '<input type="text" id="cpPid" maxlength="4" placeholder="1234" />', 'Mode 22 uses 4 hex digits, Mode 01 uses 2.')}
        ${field('Response bytes', '<select id="cpBytes"><option>1</option><option selected>2</option><option>3</option><option>4</option></select>')}
        ${field('Formula', '<input type="text" id="cpFormula" placeholder="((A*256)+B)/10" value="((A*256)+B)/10" />', 'Use A, B, C, D for the response bytes.')}
        ${field('Minimum', '<input type="number" id="cpMin" value="0" step="any" />')}
        ${field('Maximum', '<input type="number" id="cpMax" value="100" step="any" />')}
        ${field('Decimals', '<input type="number" id="cpDecimals" value="1" min="0" max="3" />')}
      </div>
      <div class="callout" style="margin-top:14px">${icon('shield')}<div>Wrong formulas cannot damage the car, but they can show misleading values. Mode 22 PIDs are manufacturer-specific and may not be supported by your ECU.</div></div>`,
    actions: [
      { label: 'Cancel' },
      {
        label: 'Add PID', kind: 'primary', icon: 'plus',
        onClick: (api) => {
          const name = api.body.querySelector('#cpName').value.trim();
          const mode = api.body.querySelector('#cpMode').value;
          const pid = api.body.querySelector('#cpPid').value.trim().toUpperCase();
          const formula = api.body.querySelector('#cpFormula').value.trim();
          const unit = api.body.querySelector('#cpUnit').value.trim();
          const bytes = Number(api.body.querySelector('#cpBytes').value);
          const min = Number(api.body.querySelector('#cpMin').value);
          const max = Number(api.body.querySelector('#cpMax').value);
          const decimals = Number(api.body.querySelector('#cpDecimals').value);

          if (!name) { toast('Name required', { type: 'warn' }); return false; }
          const re = mode === '22' ? /^[0-9A-F]{4}$/ : /^[0-9A-F]{2}$/;
          if (!re.test(pid)) {
            toast('Invalid PID', { message: mode === '22' ? 'Enter 4 hex digits.' : 'Enter 2 hex digits.', type: 'err' });
            return false;
          }
          try {
            evalFormula(formula, [1, 2, 3, 4]);
          } catch (err) {
            toast('Invalid formula', { message: err.message, type: 'err' });
            return false;
          }
          const id = uid('cp');
          setState((st) => {
            st.customPids.push({ id, name, mode, pid, formula, unit, bytes, min, max, decimals });
          });
          toast('Custom PID added', { message: name, type: 'ok' });
          done();
        },
      },
    ],
  });
};
