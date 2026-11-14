/* AutoPulse OBD2 — diagnostics: DTCs, freeze frame, Mode 06, readiness */

import { getState, activeVehicle } from '../core/store.js';
import { PIDS_BY_KEY } from '../data/pids.js';
import { lookupDtc, severityRank, dtcLibraryInfo } from '../data/dtc.js';
import { displayPid } from '../core/display.js';
import { icon } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog, emptyState, spinner, tabs } from './components.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, fmtDate } from '../core/utils.js';

let lastResult = null;
let lastModuleResult = null;
let lastTab = 'codes';
let scanning = false;
let scanningModules = false;

const severityChip = (sev) => {
  const rank = severityRank(sev);
  const cls = rank >= 3 ? 'danger' : rank === 2 ? 'warn' : 'info';
  const label = rank >= 3 ? 'High' : rank === 2 ? 'Medium' : 'Low';
  return `<span class="chip ${cls}">${label}</span>`;
};

const statusChip = (status) => {
  if (status === 'stored') return '<span class="chip danger">Stored</span>';
  if (status === 'pending') return '<span class="chip warn">Pending</span>';
  if (status === 'permanent') return '<span class="chip info">Permanent</span>';
  if (status === 'inactive') return '<span class="chip">Inactive</span>';
  return '';
};

const protocolLabel = (protocol) => {
  if (protocol === 'uds') return 'UDS';
  if (protocol === 'kwp') return 'KWP2000';
  if (protocol === 'obd') return 'Mode 03';
  return '—';
};

export const render = (view) => {
  const build = () => {
    const s = getState();
    const vehicle = activeVehicle();
    const res = lastResult;
    const dtcs = res?.dtcs || [];
    const stored = dtcs.filter((d) => d.status === 'stored').length;
    const pending = dtcs.filter((d) => d.status === 'pending').length;
    const permanent = dtcs.filter((d) => d.status === 'permanent').length;
    const monitors = res?.readiness?.monitors || [];
    const complete = monitors.filter((m) => m.complete).length;
    const mil = res?.readiness?.mil ?? stored > 0;
    const modules = lastModuleResult?.modules || [];
    const moduleCodes = modules.reduce((n, m) => n + (m.dtcs?.length || 0), 0);
    const presentModules = modules.filter((m) => m.present).length;
    const hasSession = Boolean(res || lastModuleResult);

    view.innerHTML = `
      ${pageHead('Diagnostics', `Fault codes and emissions data for ${vehicle.name}.`, `
        <button class="btn btn-sm" id="dtcClearBtn" type="button" ${dtcs.length ? '' : 'disabled'}>${icon('trash')}<span>Clear codes</span></button>
        <button class="btn btn-sm" id="moduleScanBtn" type="button" ${scanningModules ? 'disabled' : ''}>${icon(scanningModules ? 'refresh' : 'grid')}<span>${scanningModules ? 'Scanning modules…' : 'Scan all modules'}</span></button>
        <button class="btn btn-sm btn-primary" id="dtcScanBtn" type="button" ${scanning ? 'disabled' : ''}>${icon(scanning ? 'refresh' : 'search')}<span>${scanning ? 'Scanning…' : 'Scan vehicle'}</span></button>
      `)}

      <div class="dtc-summary" id="dtcSummary">
        ${res ? `
          <div class="dtc-ring ${dtcs.length ? 'has-errors' : ''}" style="--pct:${dtcs.length ? Math.min(90, 30 + dtcs.length * 12) : 0}%">
            <b>${dtcs.length}</b>
          </div>
          <div style="flex:1;min-width:0">
            <div class="row wrap" style="gap:8px">
              <span class="chip ${mil ? 'danger' : 'ok'}">${mil ? 'MIL on' : 'MIL off'}</span>
              <span class="chip ${dtcs.length ? 'warn' : 'ok'}">${dtcs.length ? `${dtcs.length} code${dtcs.length === 1 ? '' : 's'}` : 'No codes'}</span>
              ${monitors.length ? `<span class="chip ${complete === monitors.length ? 'ok' : 'warn'}">Readiness ${complete}/${monitors.length}</span>` : ''}
              ${permanent ? `<span class="chip info">${permanent} permanent</span>` : ''}
              ${lastModuleResult ? `<span class="chip ${moduleCodes ? 'warn' : 'ok'}">${moduleCodes ? `${moduleCodes} module code${moduleCodes === 1 ? '' : 's'}` : `Modules clean · ${presentModules}/${modules.length}`}</span>` : ''}
            </div>
            <div style="font-size:15px;font-weight:700;margin-top:9px">
              ${dtcs.length ? 'Faults detected — review the codes below' : 'No stored trouble codes'}
            </div>
            <div class="small muted" style="margin-top:3px">
              ${stored} stored · ${pending} pending · ${permanent} permanent
              ${res.scannedAt ? ` · scanned ${fmtDate(res.scannedAt)}` : ''}
            </div>
          </div>` : lastModuleResult ? `
          <div class="dtc-ring ${moduleCodes ? 'has-errors' : ''}" style="--pct:${moduleCodes ? Math.min(90, 30 + moduleCodes * 12) : 0}%">
            <b>${moduleCodes}</b>
          </div>
          <div style="flex:1;min-width:0">
            <div class="row wrap" style="gap:8px">
              <span class="chip info">Module scan only</span>
              <span class="chip ${moduleCodes ? 'warn' : 'ok'}">${moduleCodes ? `${moduleCodes} module code${moduleCodes === 1 ? '' : 's'}` : 'Modules clean'}</span>
              <span class="chip ${presentModules ? 'ok' : 'warn'}">${presentModules}/${modules.length} responded</span>
            </div>
            <div style="font-size:15px;font-weight:700;margin-top:9px">${moduleCodes ? 'Module faults detected — review the Modules tab' : 'No module trouble codes'}</div>
            <div class="small muted" style="margin-top:3px">
              ${escapeHtml(lastModuleResult.preset?.label || 'Module scan')}${lastModuleResult.scannedAt ? ` · scanned ${fmtDate(lastModuleResult.scannedAt)}` : ''}
            </div>
          </div>` : `
          <div class="dtc-ring"><b>—</b></div>
          <div style="flex:1">
            <div class="row wrap" style="gap:8px"><span class="chip">Not scanned</span><span class="chip info">${connection.mode === 'demo' ? 'Demo vehicle' : connection.info.protocol || 'Adapter'}</span></div>
            <div style="font-size:15px;font-weight:700;margin-top:9px">Run a scan to read this vehicle</div>
            <div class="small muted" style="margin-top:3px">Reads stored, pending and permanent codes, freeze frame, Mode 06 and emissions readiness.</div>
          </div>`}
      </div>

      <div style="margin-top:18px">
        ${hasSession ? `
          ${tabs([
            { id: 'codes', label: `Trouble codes${dtcs.length ? ` (${dtcs.length})` : ''}`, icon: 'alert' },
            { id: 'modules', label: `Modules${moduleCodes ? ` (${moduleCodes})` : ''}`, icon: 'grid' },
            { id: 'freeze', label: 'Freeze frame', icon: 'clock' },
            { id: 'mode06', label: 'Mode 06', icon: 'activity' },
            { id: 'readiness', label: 'Readiness', icon: 'shield' },
          ], lastTab)}
          <div id="tabCodes" class="tab-panel" ${lastTab !== 'codes' ? 'hidden' : ''}>${res
            ? codesPanel(dtcs)
            : emptyState('search', 'Engine codes not scanned', 'A module scan does not run the generic Mode 03 engine scan. Select Scan vehicle to read ECM codes, freeze frame, Mode 06 and readiness.', '<button class="btn btn-primary btn-sm" id="dtcScanEmpty" type="button">Scan vehicle</button>')}</div>
          <div id="tabModules" class="tab-panel" ${lastTab !== 'modules' ? 'hidden' : ''}>${modulesPanel(lastModuleResult)}</div>
          <div id="tabFreeze" class="tab-panel" ${lastTab !== 'freeze' ? 'hidden' : ''}>${freezePanel(res?.freezeFrame)}</div>
          <div id="tabMode06" class="tab-panel" ${lastTab !== 'mode06' ? 'hidden' : ''}>${mode06Panel(res?.mode06)}</div>
          <div id="tabReadiness" class="tab-panel" ${lastTab !== 'readiness' ? 'hidden' : ''}>${readinessPanel(res?.readiness, monitors)}</div>
        ` : `
          <div class="callout">${icon('shield')}<div>Scanning is read-only. Clearing codes should only be done after the underlying fault has been repaired — otherwise the ECU will simply store the code again and readiness monitors must rerun.</div></div>
          <div style="margin-top:14px">${emptyState('search', 'No diagnostic session yet', 'Connect an adapter or use the demo vehicle, then select Scan vehicle.', '<button class="btn btn-primary btn-sm" id="dtcScanEmpty" type="button">Scan now</button>')}</div>
        `}
      </div>`;

    bind();
  };

  const bind = () => {
    view.querySelector('#dtcScanBtn')?.addEventListener('click', doScan);
    view.querySelector('#dtcScanEmpty')?.addEventListener('click', doScan);
    view.querySelector('#dtcClearBtn')?.addEventListener('click', clearCodes);
    view.querySelector('#moduleScanBtn')?.addEventListener('click', doModuleScan);
    view.querySelector('#moduleScanEmpty')?.addEventListener('click', doModuleScan);

    view.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lastTab = btn.dataset.tab;
        view.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        ['codes', 'modules', 'freeze', 'mode06', 'readiness'].forEach((id) => {
          const panel = view.querySelector(`#tab${id.charAt(0).toUpperCase()}${id.slice(1)}`);
          if (panel) panel.hidden = id !== lastTab;
        });
      });
    });

    view.querySelectorAll('[data-dtc]').forEach((el) => {
      el.addEventListener('click', () => openDtc(el.dataset.dtc, { module: el.dataset.module || undefined }));
    });
  };

  const doScan = async () => {
    if (scanning) return;
    scanning = true;
    build();
    const summary = view.querySelector('#dtcSummary');
    if (summary) summary.innerHTML = `<div style="padding:18px;width:100%">${spinner('Scanning stored, pending and permanent codes…')}</div>`;
    try {
      const res = await connection.scanDtcs();
      lastResult = res;
      const n = res.dtcs.length;
      toast(n ? 'Scan complete' : 'No trouble codes', {
        message: n ? `${n} code${n === 1 ? '' : 's'} found` : 'All modules reported clean',
        type: n ? 'warn' : 'ok',
      });
    } catch (err) {
      toast('Scan failed', { message: err.message || 'Could not read the vehicle', type: 'err' });
    } finally {
      scanning = false;
      build();
    }
  };

  const doModuleScan = async () => {
    if (scanningModules) return;
    scanningModules = true;
    lastTab = 'modules';
    build();
    try {
      const res = await connection.scanModules();
      lastModuleResult = res;
      const modules = res.modules || [];
      const count = modules.reduce((n, m) => n + (m.dtcs?.length || 0), 0);
      const present = modules.filter((m) => m.present).length;
      toast('Module scan complete', {
        message: count
          ? `${count} code${count === 1 ? '' : 's'} across ${present}/${modules.length} responding modules`
          : present
            ? `No codes in ${present}/${modules.length} responding modules`
            : 'No modules responded — check ignition, adapter protocol and CAN wiring',
        type: count ? 'warn' : present ? 'ok' : 'err',
      });
    } catch (err) {
      toast('Module scan failed', { message: err.message || 'Could not address the modules', type: 'err' });
    } finally {
      scanningModules = false;
      build();
    }
  };

  const clearCodes = async () => {
    if (!lastResult?.dtcs?.length) return;
    const s = getState();
    if (s.settings.confirmClearCodes) {
      const ok = await confirmDialog({
        title: 'Clear trouble codes?',
        message: 'This clears stored codes, freeze frame data and emissions readiness on the ECU. Only do this after repairing the fault. It does not fix anything by itself.',
        okLabel: 'Clear codes',
        danger: true,
        iconName: 'trash',
      });
      if (!ok) return;
    }
    try {
      await connection.clearDtcs();
      lastResult = {
        ...lastResult,
        dtcs: [],
        freezeFrame: {},
        mode06: [],
        readiness: {
          ...(lastResult.readiness || {}),
          mil: false,
          dtcCount: 0,
          monitors: (lastResult.readiness?.monitors || []).map((m) => ({ ...m, complete: false })),
        },
      };
      toast('Codes cleared', { message: 'Readiness monitors will rerun as you drive.', type: 'ok' });
    } catch (err) {
      toast('Could not clear codes', { message: err.message, type: 'err' });
    }
    build();
  };

  build();
  return () => {};
};

const codesPanel = (dtcs) => {
  const lib = dtcLibraryInfo();
  const vehicle = activeVehicle();
  const libraryNote = `
    <div class="callout" style="margin-top:6px">${icon('info')}<div>
      <b>Generic scan reads the ECM/PCM only.</b> Use <b>Scan all modules</b> for direct TCM, ABS and airbag reads over UDS/KWP2000. That scan is experimental and depends on the adapter and vehicle.
      <div class="small muted" style="margin-top:4px">Code library ${escapeHtml(lib.version)} · ${lib.builtIn} built-in${lib.downloaded ? ` + ${lib.downloaded} downloaded (${escapeHtml(lib.packVersion || 'pack')})` : ''} descriptions.</div>
    </div></div>`;

  if (!dtcs.length) {
    return `<div class="dtc-empty">${icon('shield')}<b>No trouble codes stored</b><span class="small">The ECU did not report any stored, pending or permanent faults.</span></div>${libraryNote}`;
  }
  const groups = [
    { status: 'stored', label: 'Stored codes', list: dtcs.filter((d) => d.status === 'stored') },
    { status: 'pending', label: 'Pending codes', list: dtcs.filter((d) => d.status === 'pending') },
    { status: 'permanent', label: 'Permanent codes', list: dtcs.filter((d) => d.status === 'permanent') },
  ].filter((g) => g.list.length);

  return `${groups.map((g) => `
    <div class="between" style="margin:6px 0 8px">
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.9px;color:var(--muted)">${g.label}</h3>
      <span class="small muted">${g.list.length}</span>
    </div>
    <div class="stack" style="margin-bottom:16px">
      ${g.list.map((d) => {
        const info = lookupDtc(d.code, {
          make: vehicle?.make,
          model: vehicle?.model,
          module: d.module,
          system: d.system,
        });
        const scope = [info.make, info.model, info.module].filter(Boolean).join(' · ');
        return `<div class="dtc-item" data-dtc="${escapeHtml(d.code)}" data-module="${escapeHtml(d.module || '')}" style="cursor:pointer">
          <div class="dtc-code">${escapeHtml(d.code)}</div>
          <div style="flex:1;min-width:0">
            <div class="dtc-desc">${escapeHtml(info.description)}</div>
            <div class="dtc-meta">
              <span>${escapeHtml(info.system)}</span>
              <span>ECU: ${escapeHtml(d.ecu || d.module || 'ECM')}</span>
              ${scope ? `<span class="chip info" style="padding:1px 6px">${escapeHtml(scope)}</span>` : ''}
              ${d.freezeFrame ? '<span class="chip info" style="padding:1px 6px">Freeze frame</span>' : ''}
            </div>
          </div>
          <div class="stack" style="align-items:flex-end;gap:6px">
            ${statusChip(d.status)}
            ${severityChip(info.severity)}
          </div>
        </div>`;
      }).join('')}
    </div>`).join('')}${libraryNote}`;
};

const moduleCard = (module, context) => {
  const dtcs = module.dtcs || [];
  const stateChip = !module.present
    ? '<span class="chip warn">No response</span>'
    : dtcs.length
      ? `<span class="chip danger">${dtcs.length} code${dtcs.length === 1 ? '' : 's'}</span>`
      : '<span class="chip ok">No codes</span>';
  const proto = module.present ? protocolLabel(module.protocol) : '—';
  const meta = `${proto} · ${module.request} → ${module.response}${module.note ? ` · ${module.note}` : ''}`;

  return `
    <div class="settings-group">
      <h3>${icon('cog')} ${escapeHtml(module.name)} <span class="chip">${escapeHtml(module.short)}</span></h3>
      <div class="settings-row">
        <div class="sr-text">
          <b>${escapeHtml(module.present
            ? (dtcs.length ? `${dtcs.length} trouble code${dtcs.length === 1 ? '' : 's'}` : 'Responding, no codes')
            : 'No response')}</b>
          <span>${escapeHtml(meta)}</span>
        </div>
        <div class="sr-control">${stateChip}</div>
      </div>
      ${dtcs.length ? `<div class="stack" style="padding:0 12px 12px">
        ${dtcs.map((dtc) => {
          const info = lookupDtc(dtc.code, {
            ...context,
            module: dtc.module || module.dtcModule,
            system: dtc.system,
          });
          const scope = [info.make, info.model, info.module].filter(Boolean).join(' · ');
          return `<div class="dtc-item" data-dtc="${escapeHtml(dtc.code)}" data-module="${escapeHtml(dtc.module || module.dtcModule || '')}" style="cursor:pointer">
            <div class="dtc-code">${escapeHtml(dtc.udsCode || dtc.code)}</div>
            <div style="flex:1;min-width:0">
              <div class="dtc-desc">${escapeHtml(info.description)}</div>
              <div class="dtc-meta">
                <span>${escapeHtml(info.system)}</span>
                <span>${escapeHtml(module.short)} · ${escapeHtml(dtc.udsCode || dtc.code)}</span>
                ${scope ? `<span class="chip info" style="padding:1px 6px">${escapeHtml(scope)}</span>` : ''}
              </div>
            </div>
            <div class="stack" style="align-items:flex-end;gap:6px">
              ${statusChip(dtc.status)}
              ${severityChip(info.severity)}
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;
};

const modulesPanel = (result) => {
  if (scanningModules) {
    return `<div style="padding:18px">${spinner('Addressing ECM, TCM, ABS and SRS modules…')}</div>`;
  }
  if (!result) {
    return emptyState(
      'grid',
      'No module scan yet',
      'Generic OBD-II reads the engine module only. A module scan directly addresses the TCM, ABS and airbag controllers over CAN using UDS or KWP2000.',
      '<button class="btn btn-primary btn-sm" id="moduleScanEmpty" type="button">Scan all modules</button>',
    );
  }

  const vehicle = activeVehicle();
  const context = { make: vehicle?.make, model: vehicle?.model };
  const modules = result.modules || [];
  const total = modules.reduce((n, m) => n + (m.dtcs?.length || 0), 0);
  const present = modules.filter((m) => m.present).length;

  return `
    <div class="callout ${result.experimental ? 'warn' : ''}" style="margin-bottom:14px">${icon(result.experimental ? 'alert' : 'info')}<div>
      <b>${result.experimental ? 'Experimental module scan.' : 'Demo module scan.'}</b>
      ${result.experimental
        ? ' Read-only UDS/KWP requests to the standard 11-bit CAN addresses. ELM327 v1.5 clones often fail on multi-frame replies, so a module that does not answer may still be healthy.'
        : ' Simulated results for the active demo vehicle.'}
      <div class="small muted" style="margin-top:4px">
        ${escapeHtml(result.preset?.label || 'Generic CAN')} · ${present}/${modules.length} modules responded · ${total} code${total === 1 ? '' : 's'}${result.scannedAt ? ` · ${fmtDate(result.scannedAt)}` : ''}
      </div>
    </div></div>
    <div class="stack" style="gap:12px">
      ${modules.map((module) => moduleCard(module, context)).join('')}
    </div>
    <div class="callout" style="margin-top:14px">${icon('info')}<div>Module codes are not cleared by the generic <b>Clear codes</b> button. Use the manufacturer's scan tool for module-specific clearing and service functions.</div></div>`;
};

const freezePanel = (frame) => {
  if (!frame || !Object.keys(frame).length) {
    return emptyState('clock', 'No freeze frame stored', 'Freeze frame is captured by the ECU when an emissions-related fault is stored. Clear codes will erase it.');
  }
  const entries = Object.entries(frame).filter(([k]) => k !== 'capturedAt' && PIDS_BY_KEY[k]);
  return `
    <div class="callout" style="margin-bottom:14px">${icon('clock')}<div>Snapshot of operating conditions when the fault was stored${frame.capturedAt ? ` · ${fmtDate(frame.capturedAt)}` : ''}.</div></div>
    <div class="perf-result">
      ${entries.map(([key, value]) => {
        const pid = PIDS_BY_KEY[key];
        const d = displayPid(pid, value);
        return `<div><b>${escapeHtml(d.text)}</b><span>${escapeHtml(pid.short)} · ${escapeHtml(d.unit)}</span></div>`;
      }).join('')}
    </div>`;
};

const mode06Panel = (rows) => {
  if (!rows || !rows.length) {
    return emptyState('activity', 'No Mode 06 results', 'Mode 06 on-board monitor results are manufacturer-specific. This adapter or ECU did not return test values. Generic OBD-II readiness is still available on the Readiness tab.');
  }
  return `
    <div class="callout" style="margin-bottom:14px">${icon('activity')}<div>On-board monitor test results reported by the ECU. Pass/fail limits are defined by the manufacturer.</div></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Monitor test</th><th class="num">Value</th><th class="num">Min</th><th class="num">Max</th><th>Unit</th><th>Result</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${escapeHtml(r.name)}</td>
            <td class="num">${escapeHtml(String(r.value))}</td>
            <td class="num">${escapeHtml(String(r.min))}</td>
            <td class="num">${escapeHtml(String(r.max))}</td>
            <td>${escapeHtml(r.unit || '')}</td>
            <td><span class="chip ${r.status === 'pass' ? 'ok' : r.status === 'fail' ? 'danger' : 'warn'}">${escapeHtml(r.status)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

const readinessPanel = (readiness, monitors) => {
  if (!monitors.length) {
    return emptyState('shield', 'Readiness not reported', 'This ECU did not return emissions readiness data. Drive the vehicle through a complete cycle and scan again.');
  }
  const cont = monitors.filter((m) => m.type === 'continuous');
  const nonCont = monitors.filter((m) => m.type !== 'continuous');
  const group = (title, list) => `
    <div class="settings-group">
      <h3>${title}</h3>
      ${list.map((m) => `
        <div class="settings-row">
          <div class="sr-text"><b>${escapeHtml(m.name)}</b><span>${m.type === 'continuous' ? 'Continuous monitor' : 'Non-continuous monitor'}</span></div>
          <div class="sr-control"><span class="chip ${m.complete ? 'ok' : 'warn'}">${m.complete ? 'Complete' : 'Incomplete'}</span></div>
        </div>`).join('')}
    </div>`;

  return `
    <div class="callout ${readiness?.mil ? 'danger' : ''}" style="margin-bottom:14px">${icon('shield')}<div>
      MIL is <b>${readiness?.mil ? 'on' : 'off'}</b>. ${monitors.filter((m) => m.complete).length} of ${monitors.length} supported monitors are complete.
      ${readiness?.mil ? ' A stored fault is keeping the MIL on.' : ' An emissions test usually requires all monitors to be complete.'}
    </div></div>
    ${group('Continuous monitors', cont)}
    ${group('Non-continuous monitors', nonCont)}`;
};

const openDtc = (code, context = {}) => {
  const vehicle = activeVehicle();
  const info = lookupDtc(code, {
    make: vehicle?.make,
    model: vehicle?.model,
    module: context.module,
    system: context.system,
  });
  const scope = [info.make, info.model, info.module].filter(Boolean).join(' · ');
  const specific = Boolean(info.make || info.model || info.module);
  const scopeRow = scope
    ? `<div class="row wrap" style="gap:6px;align-items:center">
        <span class="chip info">${escapeHtml(scope)}</span>
        <span class="small muted">Matched to this vehicle and module.</span>
      </div>`
    : '';
  const note = specific
    ? `<div class="callout">${icon('info')}<div>This description is matched to <b>${escapeHtml(scope)}</b>. Always confirm with the manufacturer's diagnostic procedure and live data before replacing parts.</div></div>`
    : `<div class="callout warn">${icon('alert')}<div>This description is generic. Always confirm with the manufacturer's diagnostic procedure and live data before replacing parts.</div></div>`;

  modal({
    title: code,
    subtitle: `${info.system} · ${info.severity} severity${info.module ? ` · ${info.module}` : ''}`,
    body: `
      <div class="stack">
        <div style="font-size:15px;font-weight:700">${escapeHtml(info.description)}</div>
        ${scopeRow}
        <div class="divider"></div>
        <div>
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.8px;font-weight:800;margin-bottom:6px">Possible causes</div>
          <ul class="list-reset stack" style="gap:6px">${info.causes.map((c) => `<li class="row" style="align-items:flex-start;gap:8px;font-size:12.5px">${icon('arrow-right', 'tiny')}<span>${escapeHtml(c)}</span></li>`).join('')}</ul>
        </div>
        <div>
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.8px;font-weight:800;margin-bottom:6px">Typical symptoms</div>
          <div class="row wrap" style="gap:6px">${info.symptoms.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('')}</div>
        </div>
        ${note}
      </div>`,
    actions: [{ label: 'Close', kind: 'primary' }],
  });
};
