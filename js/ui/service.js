/* AutoPulse OBD2 — service functions and manufacturer coding */

import { getState, setState, addServiceRecord } from '../core/store.js';
import { SERVICE_FUNCTIONS, CODING_BRANDS } from '../data/vehicles.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState, tabs } from './components.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, fmtDate, sleep } from '../core/utils.js';

let activeTab = 'service';
let activeBrand = 'vag';

export const render = (view) => {
  const build = () => {
    const s = getState();
    const history = s.serviceHistory || [];
    const brand = CODING_BRANDS.find((b) => b.id === activeBrand) || CODING_BRANDS[0];

    view.innerHTML = `
      ${pageHead('Service & coding', 'Maintenance routines, adaptations and manufacturer customisation.', `
        <span class="chip ${connection.mode === 'demo' ? 'info' : 'warn'}">${connection.mode === 'demo' ? 'Demo mode' : 'Live adapter'}</span>
      `)}
      ${tabs([
        { id: 'service', label: 'Service functions', icon: 'wrench' },
        { id: 'coding', label: 'Coding & adaptations', icon: 'code' },
        { id: 'history', label: `History${history.length ? ` (${history.length})` : ''}`, icon: 'clock' },
      ], activeTab)}
      <div id="servicePanel" ${activeTab !== 'service' ? 'hidden' : ''}>
        <div class="callout warn" style="margin-bottom:14px">${icon('shield')}<div>
          Service functions change vehicle systems. Support depends on the vehicle, ECU and adapter. In demo mode every routine is simulated and no vehicle is affected. Never run service routines on a public road.
        </div></div>
        <div class="service-grid">
          ${SERVICE_FUNCTIONS.map((f) => `
            <div class="service-card">
              <div class="sc-icon">${icon(f.icon)}</div>
              <h4>${escapeHtml(f.name)}</h4>
              <p>${escapeHtml(f.desc)}</p>
              <div class="row wrap" style="gap:5px">
                <span class="chip">${escapeHtml(f.module)}</span>
                ${f.engineOff ? '<span class="chip warn">Engine off</span>' : ''}
                ${f.danger ? '<span class="chip danger">Caution</span>' : ''}
              </div>
              <div class="sc-foot">
                <span class="badge ${connection.mode === 'demo' ? 'info' : 'accent'}">${connection.mode === 'demo' ? 'Simulated' : 'Adapter'}</span>
                <button class="btn btn-sm" type="button" data-service="${f.id}">${icon('play')}<span>Run</span></button>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div id="codingPanel" ${activeTab !== 'coding' ? 'hidden' : ''}>
        <div class="between" style="margin-bottom:12px;flex-wrap:wrap;gap:10px">
          <div class="row wrap" style="gap:8px">
            <select id="codingBrand" style="min-width:240px">
              ${CODING_BRANDS.map((b) => `<option value="${b.id}" ${b.id === brand.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
            </select>
            <span class="chip">${escapeHtml(brand.protocol)}</span>
          </div>
          <div class="row" style="gap:8px">
            <button class="btn btn-sm" id="codingReadBtn" type="button">${icon('download')}<span>Read from vehicle</span></button>
            <button class="btn btn-sm btn-primary" id="codingApplyBtn" type="button">${icon('upload')}<span>Apply changes</span></button>
          </div>
        </div>
        <div class="callout warn" style="margin-bottom:14px">${icon('alert')}<div>
          Manufacturer coding uses UDS/OEM protocols and vehicle-specific datasets. This build includes a <b>demonstration catalogue</b>; applying changes only works in demo mode and does not write to a real car. Real coding requires a compatible interface and licensed data.
        </div></div>
        <div id="codingModules">
          ${brand.modules.map((m) => `
            <div class="settings-group">
              <h3>${escapeHtml(m.name)} · address ${escapeHtml(m.address)}</h3>
              ${m.functions.map((fn) => {
                const current = s.coding?.[brand.id]?.[m.id]?.[fn.id];
                const checked = current === undefined ? fn.def : Boolean(current);
                return `<div class="settings-row">
                  <div class="sr-text"><b>${escapeHtml(fn.name)}</b><span>${escapeHtml(fn.desc)}</span></div>
                  <div class="sr-control">
                    <label class="switch">
                      <input type="checkbox" data-coding="${m.id}:${fn.id}" ${checked ? 'checked' : ''} />
                      <span class="track"></span>
                    </label>
                  </div>
                </div>`;
              }).join('')}
            </div>`).join('')}
        </div>
      </div>

      <div id="historyPanel" ${activeTab !== 'history' ? 'hidden' : ''}>
        ${history.length ? `
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Routine</th><th>Module</th><th>Source</th><th>Result</th><th>Date</th></tr></thead>
              <tbody>
                ${history.map((h) => `<tr>
                  <td>${escapeHtml(h.name)}</td>
                  <td class="small muted">${escapeHtml(h.module || '—')}</td>
                  <td><span class="chip ${h.mode === 'demo' ? 'info' : 'accent'}">${escapeHtml(h.mode === 'demo' ? 'Demo' : 'Adapter')}</span></td>
                  <td><span class="chip ok">${escapeHtml(h.status || 'completed')}</span></td>
                  <td class="small muted">${escapeHtml(fmtDate(h.createdAt))}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : emptyState('wrench', 'No service history', 'Routines you run are recorded here with a timestamp.')}
      </div>`;

    bind();
  };

  const bind = () => {
    view.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        activeTab = b.dataset.tab;
        build();
      });
    });

    view.querySelectorAll('[data-service]').forEach((b) => {
      b.addEventListener('click', () => {
        const fn = SERVICE_FUNCTIONS.find((f) => f.id === b.dataset.service);
        if (fn) runService(fn, build);
      });
    });

    view.querySelector('#codingBrand')?.addEventListener('change', (e) => {
      activeBrand = e.target.value;
      build();
    });

    view.querySelectorAll('[data-coding]').forEach((input) => {
      input.addEventListener('change', () => {
        const [moduleId, fnId] = input.dataset.coding.split(':');
        setState((st) => {
          st.coding = st.coding || {};
          st.coding[activeBrand] = st.coding[activeBrand] || {};
          st.coding[activeBrand][moduleId] = st.coding[activeBrand][moduleId] || {};
          st.coding[activeBrand][moduleId][fnId] = input.checked;
        });
      });
    });

    view.querySelector('#codingReadBtn')?.addEventListener('click', async () => {
      const brand = CODING_BRANDS.find((b) => b.id === activeBrand);
      const btn = view.querySelector('#codingReadBtn');
      if (btn) btn.disabled = true;
      await sleep(900);
      toast('Coding read', { message: `${brand.name}: ${brand.modules.length} modules scanned (demo data).`, type: 'ok' });
      if (btn) btn.disabled = false;
    });

    view.querySelector('#codingApplyBtn')?.addEventListener('click', () => applyCoding(activeBrand, build));
  };

  build();
  return () => {};
};

const runService = async (fn, done) => {
  const ok = await confirmDialog({
    title: `Run ${fn.name}?`,
    message: `${fn.desc} ${fn.danger ? 'This routine can affect safety systems — make sure the vehicle is safely supported and stationary.' : ''}`,
    okLabel: 'Run routine',
    danger: Boolean(fn.danger),
    iconName: fn.icon || 'wrench',
  });
  if (!ok) return;

  const steps = [
    'Opening diagnostic session…',
    'Checking vehicle conditions…',
    'Sending routine request…',
    'Waiting for ECU acknowledgement…',
    'Verifying result…',
  ];
  let timer = null;
  const api = modal({
    title: fn.name,
    subtitle: fn.module,
    narrow: true,
    dismissible: false,
    body: `
      <div class="stack">
        <div class="row between"><span class="small" id="svcStep">${steps[0]}</span><span class="mono small" id="svcPct">0%</span></div>
        <div class="progress"><i id="svcBar" style="width:0%"></i></div>
        <div class="terminal-out" id="svcLog" style="height:150px;border:1px solid var(--line);border-radius:10px">${connection.mode === 'demo' ? '> demo mode — no vehicle commands are transmitted\n' : '> live adapter session\n'}</div>
      </div>`,
    actions: [{ label: 'Cancel', kind: 'ghost', onClick: () => { clearInterval(timer); } }],
  });

  const bar = api.body.querySelector('#svcBar');
  const pctEl = api.body.querySelector('#svcPct');
  const stepEl = api.body.querySelector('#svcStep');
  const log = api.body.querySelector('#svcLog');
  const start = Date.now();
  const duration = connection.mode === 'demo' ? fn.duration : Math.max(1500, fn.duration);
  const stepMs = duration / steps.length;

  timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    const stepIndex = Math.min(steps.length - 1, Math.floor(elapsed / stepMs));
    if (stepEl) stepEl.textContent = steps[stepIndex];
    if (log && stepIndex !== log.dataset.step) {
      log.dataset.step = String(stepIndex);
      log.textContent += `> ${steps[stepIndex]}\n`;
      log.scrollTop = log.scrollHeight;
    }
    if (elapsed >= duration) {
      clearInterval(timer);
      if (log) {
        log.textContent += `> ${fn.name} completed successfully\n`;
        log.scrollTop = log.scrollHeight;
      }
      addServiceRecord({
        name: fn.name,
        module: fn.module,
        status: 'completed',
        mode: connection.mode,
      });
      setTimeout(() => {
        api.close();
        done();
        toast('Routine completed', { message: `${fn.name} finished${connection.mode === 'demo' ? ' (simulated)' : ''}.`, type: 'ok' });
      }, 550);
    }
  }, 120);
};

const applyCoding = async (brandId, done) => {
  const brand = CODING_BRANDS.find((b) => b.id === brandId);
  if (!brand) return;
  if (connection.mode !== 'demo') {
    toast('Demo only', { message: 'Real manufacturer coding requires OEM protocol support that this build does not include. Connect the demo vehicle to try it.', type: 'warn', timeout: 6000 });
    return;
  }
  const ok = await confirmDialog({
    title: 'Apply coding changes?',
    message: `The selected ${brand.name} adaptations will be written to the simulated vehicle. On a real car, incorrect coding can disable safety systems.`,
    okLabel: 'Apply changes',
    danger: true,
    iconName: 'upload',
  });
  if (!ok) return;

  let timer = null;
  const api = modal({
    title: 'Applying coding',
    subtitle: brand.name,
    narrow: true,
    dismissible: false,
    body: `
      <div class="stack">
        <div class="row between"><span class="small" id="codStep">Authenticating with gateway…</span><span class="mono small" id="codPct">0%</span></div>
        <div class="progress"><i id="codBar" style="width:0%"></i></div>
        <div class="terminal-out" id="codLog" style="height:150px;border:1px solid var(--line);border-radius:10px">> simulated UDS session\n</div>
      </div>`,
    actions: [{ label: 'Cancel', kind: 'ghost', onClick: () => clearInterval(timer) }],
  });
  const bar = api.body.querySelector('#codBar');
  const pctEl = api.body.querySelector('#codPct');
  const stepEl = api.body.querySelector('#codStep');
  const log = api.body.querySelector('#codLog');
  const steps = ['Authenticating with gateway…', 'Reading long coding…', 'Writing adaptation values…', 'Resetting affected modules…', 'Verifying changes…'];
  const start = Date.now();
  const duration = 4800;
  timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    const i = Math.min(steps.length - 1, Math.floor((elapsed / duration) * steps.length));
    if (stepEl) stepEl.textContent = steps[i];
    if (log && log.dataset.step !== String(i)) {
      log.dataset.step = String(i);
      log.textContent += `> ${steps[i]}\n`;
      log.scrollTop = log.scrollHeight;
    }
    if (elapsed >= duration) {
      clearInterval(timer);
      addServiceRecord({ name: `${brand.name} coding`, module: 'Coding & adaptations', status: 'applied', mode: 'demo' });
      setTimeout(() => {
        api.close();
        done();
        toast('Coding applied', { message: 'Simulated coding written successfully.', type: 'ok' });
      }, 500);
    }
  }, 120);
};
