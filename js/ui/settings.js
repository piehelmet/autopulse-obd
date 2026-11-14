/* AutoPulse OBD2 — settings and connection setup */

import {
  getState, setState, resetState, exportState, importState, activeVehicle,
} from '../core/store.js';
import { PIDS } from '../data/pids.js';
import { BAUD_RATES, PROTOCOLS } from '../data/vehicles.js';
import { icon, hydrateIcons } from '../core/icons.js';
import { pageHead, modal, toast, confirmDialog } from './components.js';
import { connection } from '../obd/connection.js';
import { isSerialSupported, isBluetoothSupported } from '../obd/transport.js';
import { isNativeApp } from '../obd/native-ble.js';
import { dtcLibraryInfo, applyDtcPack } from '../data/dtc.js';
import { download, pickFile, escapeHtml } from '../core/utils.js';

const THEME_META = { dark: '#0a0f14', light: '#eef3f7', classic: '#161009' };

export const applyTheme = (theme = 'dark') => {
  const t = theme === 'light' || theme === 'classic' ? theme : 'dark';
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.gaugeStyle = t === 'classic' ? 'classic' : 'modern';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_META[t]);
  // Redraw canvases so gauges switch between modern and classic immediately.
  window.dispatchEvent(new CustomEvent('autopulse:resize'));
};

const CURRENCIES = ['€', '$', '£', 'CHF', 'kr', 'zł', 'R$', '₹', '¥'];

const statusLabel = () => {
  if (connection.status === 'connected') return connection.mode === 'demo' ? 'Demo vehicle' : 'Connected';
  if (connection.status === 'connecting') return 'Connecting…';
  if (connection.status === 'error') return 'Connection error';
  return 'Disconnected';
};

const statusChipClass = () => {
  if (connection.status === 'connected') return connection.mode === 'demo' ? 'info' : 'ok';
  if (connection.status === 'connecting') return 'warn';
  if (connection.status === 'error') return 'danger';
  return '';
};

const row = (title, desc, control) => `
  <div class="settings-row">
    <div class="sr-text"><b>${escapeHtml(title)}</b><span>${desc}</span></div>
    <div class="sr-control">${control}</div>
  </div>`;

const group = (title, rows) => `
  <div class="settings-group">
    <h3>${title}</h3>
    ${rows}
  </div>`;

const pidOptions = (selected) => PIDS.map((p) => `
  <option value="${p.key}" ${p.key === selected ? 'selected' : ''}>${escapeHtml(p.short)} — ${escapeHtml(p.name)}</option>`).join('');

export const render = (view) => {
  const build = () => {
    const s = getState();
    const settings = s.settings;
    const serial = isSerialSupported();
    const bluetooth = isBluetoothSupported();
    const connected = connection.status === 'connected';
    const installable = Boolean(window.__apInstallPrompt);
    const lib = dtcLibraryInfo();
    const counts = {
      vehicles: s.vehicles.length,
      trips: s.trips.length,
      results: s.perfResults.length,
      custom: s.customPids.length,
    };

    view.innerHTML = `
      ${pageHead('Settings', 'Connection, units, recording and everything stored on this device.', `
        <button class="btn btn-sm btn-primary" id="setConnectionBtn" type="button">${icon('link')}<span>Connection setup</span></button>
      `)}

      <div class="grid grid-2" style="align-items:start">
        <div>
          ${group('Adapter connection', `
            ${row('Status', `${escapeHtml(connection.info.adapter || 'No adapter')} · ${escapeHtml(connection.info.protocol || 'Auto')}`,
              `<span class="chip ${statusChipClass()}">${statusLabel()}</span>`)}
            ${row('Connect', 'The demo vehicle is a full offline simulator. USB serial and Bluetooth need a compatible ELM327 adapter.', `
              <div class="row" style="gap:5px;flex-wrap:wrap;justify-content:flex-end">
                <button class="btn btn-xs" id="setConnectDemo" type="button">${icon('play')}<span>Demo</span></button>
                <button class="btn btn-xs" id="setConnectSerial" type="button" ${serial ? '' : 'disabled title="Web Serial is not supported in this browser"'}>${icon('usb')}<span>USB</span></button>
                <button class="btn btn-xs" id="setConnectBluetooth" type="button" ${bluetooth ? '' : 'disabled title="Web Bluetooth is not supported in this browser"'}>${icon('bluetooth')}<span>Bluetooth</span></button>
                ${connected ? `<button class="btn btn-xs btn-ghost" id="setDisconnect" type="button">${icon('power')}<span>Disconnect</span></button>` : ''}
              </div>`)}
            ${row('Poll rate', 'How often live values are requested. Lower is faster but can overwhelm slow adapters.', `
              <select data-setting="pollRate" style="min-width:140px">
                ${[100, 250, 500, 1000].map((ms) => `<option value="${ms}" ${Number(settings.pollRate) === ms ? 'selected' : ''}>${ms} ms</option>`).join('')}
              </select>`)}
            ${row('Serial baud rate', 'Most ELM327 USB cables use 38400. Some clones use 9600 or 115200.', `
              <select data-setting="serialBaud" style="min-width:140px">
                ${BAUD_RATES.map((b) => `<option value="${b}" ${Number(settings.serialBaud) === b ? 'selected' : ''}>${b}</option>`).join('')}
              </select>`)}
            ${row('Preferred protocol', 'Leave on Auto unless you know the vehicle protocol. Auto is recommended.', `
              <select data-setting="adapterProtocol" style="min-width:170px">
                <option value="auto" ${settings.adapterProtocol === 'auto' ? 'selected' : ''}>Auto (recommended)</option>
                ${PROTOCOLS.filter((p) => p !== 'Auto').map((p) => `<option value="${escapeHtml(p)}" ${settings.adapterProtocol === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
              </select>`)}
            ${row('Auto-connect demo', 'Load the simulated vehicle automatically when the app starts.', `
              <label class="switch"><input type="checkbox" data-setting="autoConnectDemo" ${settings.autoConnectDemo ? 'checked' : ''} /><span class="track"></span></label>`)}
          `)}

          ${group('Units &amp; display', `
            ${row('Theme', 'Dark for night driving, Light for daylight, Classic for analogue gauges and a warm instrument-panel look.', `
              <div class="segmented" id="setTheme">
                <button type="button" data-theme-choice="dark" class="${s.theme !== 'light' && s.theme !== 'classic' ? 'active' : ''}">${icon('moon')}<span>Dark</span></button>
                <button type="button" data-theme-choice="light" class="${s.theme === 'light' ? 'active' : ''}">${icon('sun')}<span>Light</span></button>
                <button type="button" data-theme-choice="classic" class="${s.theme === 'classic' ? 'active' : ''}">${icon('gauge')}<span>Classic</span></button>
              </div>`)}
            ${row('Units', 'Metric uses km/h, km, °C, L and kPa. Imperial uses mph, mi, °F, gal and psi.', `
              <div class="segmented" id="setUnits">
                <button type="button" data-units="metric" class="${settings.units !== 'imperial' ? 'active' : ''}">Metric</button>
                <button type="button" data-units="imperial" class="${settings.units === 'imperial' ? 'active' : ''}">Imperial</button>
              </div>`)}
            ${row('Shift light', 'RPM redline marker shown on the RPM gauge.', `
              <input type="number" data-setting="shiftLight" min="3000" max="8500" step="100" value="${Number(settings.shiftLight) || 6200}" style="width:120px" />`)}
            ${row('Confirm before clearing codes', 'Ask for confirmation before erasing DTCs and readiness data.', `
              <label class="switch"><input type="checkbox" data-setting="confirmClearCodes" ${settings.confirmClearCodes ? 'checked' : ''} /><span class="track"></span></label>`)}
          `)}

          ${group('HUD mode', `
            ${row('Primary metric', 'Large value shown on the left of the head-up display.', `
              <select data-setting="hudPrimary" style="min-width:190px">${pidOptions(settings.hudPrimary)}</select>`)}
            ${row('Secondary metric', 'Second value shown on the right.', `
              <select data-setting="hudSecondary" style="min-width:190px">${pidOptions(settings.hudSecondary)}</select>`)}
            ${row('Head-up display', 'Mirror the screen for reflection in the windscreen. Tap the overlay or press Esc to exit.', `
              <button class="btn btn-sm" id="setHudBtn" type="button">${icon('hud')}<span>Enter HUD</span></button>`)}
          `)}
        </div>

        <div>
          ${group('Trips &amp; fuel', `
            ${row('Automatic trip recording', 'Start a trip when the vehicle begins moving and finish it after a long stop.', `
              <label class="switch"><input type="checkbox" data-setting="autoRecordTrips" ${settings.autoRecordTrips ? 'checked' : ''} /><span class="track"></span></label>`)}
            ${row('Fuel price', 'Used to calculate the cost of each trip.', `
              <input type="number" data-setting="fuelPrice" min="0" max="100" step="0.01" value="${Number(settings.fuelPrice) || 0}" style="width:120px" />`)}
            ${row('Currency', 'Symbol shown next to fuel costs.', `
              <select data-setting="currency" style="min-width:100px">
                ${CURRENCIES.map((c) => `<option value="${escapeHtml(c)}" ${settings.currency === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>`)}
            ${row('Trip statistics', `${counts.trips} trips saved · ${counts.results} performance runs`, `
              <button class="btn btn-xs" id="setTripsBtn" type="button">${icon('route')}<span>Open trips</span></button>`)}
          `)}

          ${group('Data &amp; privacy', `
            ${row('Stored locally', `${counts.vehicles} vehicles · ${counts.trips} trips · ${counts.custom} custom PIDs. Nothing leaves this device unless you export it.`, `
              <span class="chip ok">Offline</span>`)}
            ${row('Backup', 'Export a complete JSON backup of vehicles, trips, dashboards, results and settings.', `
              <div class="row" style="gap:5px;flex-wrap:wrap;justify-content:flex-end">
                <button class="btn btn-xs" id="setExportBtn" type="button">${icon('download')}<span>Export</span></button>
                <button class="btn btn-xs" id="setImportBtn" type="button">${icon('upload')}<span>Import</span></button>
              </div>`)}
            ${row('Install app', installable
              ? 'Install AutoPulse as a standalone app on this device. It keeps working offline.'
              : 'Use your browser menu and choose “Install app” or “Add to Home screen” to install AutoPulse.', `
              <button class="btn btn-xs ${installable ? 'btn-primary' : ''}" id="setInstallBtn" type="button" ${installable ? '' : 'disabled'}>${icon('download')}<span>${installable ? 'Install' : 'Not available'}</span></button>`)}
            ${row('Clear all data', 'Delete every vehicle, trip, dashboard, result and setting from this browser. This cannot be undone.', `
              <button class="btn btn-xs btn-danger" id="setResetBtn" type="button">${icon('trash')}<span>Erase</span></button>`)}
          `)}

          ${group('Diagnostic code library', `
            ${row('Code descriptions', `${lib.builtIn} built-in descriptions${lib.downloaded ? ` plus ${lib.downloaded} from pack ${escapeHtml(lib.packVersion || '')}` : ''}. Downloaded packs add or correct descriptions without reinstalling the app.`, `
              <div class="row" style="gap:5px;flex-wrap:wrap;justify-content:flex-end">
                <span class="chip info">Library ${escapeHtml(lib.version)}</span>
                <button class="btn btn-xs" id="setDtcUpdateBtn" type="button">${icon('refresh')}<span>Check for updates</span></button>
              </div>`)}
            ${row('Module scan (TCM / ABS / airbag)', 'Generic OBD-II reads the engine control module only. Diagnostics → Scan all modules probes the standard 11-bit CAN addresses with UDS or KWP2000. Read-only and experimental: some ELM327 v1.5 clones cannot reassemble multi-frame replies.', `
              <span class="chip warn">Experimental</span>`)}
          `)}

          ${group('About', `
            <div class="settings-row">
              <div class="sr-text">
                <b>AutoPulse OBD2 v1.3.0</b>
                <span>Independent offline-capable OBD-II diagnostics PWA. Not affiliated with Car Scanner, ELM Electronics or any vehicle manufacturer.</span>
              </div>
              <div class="sr-control"><span class="chip accent">PWA</span></div>
            </div>
            <div class="settings-row">
              <div class="sr-text"><b>${isNativeApp() ? 'Android build' : 'Browser support'}</b><span>${isNativeApp() ? 'Bundled inside the app and fully offline. Bluetooth uses the Android BLE stack directly — Chrome is not involved.' : 'Chrome or Edge on desktop for Web Serial. Web Bluetooth requires HTTPS or localhost and a compatible BLE adapter. The demo works everywhere.'}</span></div>
              <div class="sr-control"><span class="chip info">${isNativeApp() ? 'Native' : 'Web APIs'}</span></div>
            </div>
            <div class="settings-row">
              <div class="sr-text"><b>Diagnostic scope</b><span>Generic OBD-II (Mode 01, 02, 03, 04, 06, 07, 09, 0A), user-defined Mode 22 PIDs, and an experimental read-only UDS/KWP module scan. Manufacturer coding and some service routines are simulated demo catalogues and do not write to a real vehicle.</span></div>
              <div class="sr-control"><span class="chip warn">Demo limits</span></div>
            </div>
            <div class="settings-row">
              <div class="sr-text"><b>Safety</b><span>Never operate the app while driving. Performance tests are for closed roads only. Service functions can affect safety systems.</span></div>
              <div class="sr-control"><span class="chip danger">Read manual</span></div>
            </div>
          `)}
        </div>
      </div>`;
    hydrateIcons(view);
    bind();
  };

  const bind = () => {
    view.querySelector('#setConnectionBtn')?.addEventListener('click', () => openConnectionModal(build));

    view.querySelector('#setConnectDemo')?.addEventListener('click', () => connect('demo', build));
    view.querySelector('#setConnectSerial')?.addEventListener('click', () => connect('serial', build));
    view.querySelector('#setConnectBluetooth')?.addEventListener('click', () => connect('bluetooth', build));
    view.querySelector('#setDisconnect')?.addEventListener('click', async () => {
      await connection.disconnect();
      toast('Disconnected', { type: 'info' });
      build();
    });

    view.querySelectorAll('[data-setting]').forEach((el) => {
      el.addEventListener('change', () => {
        const key = el.dataset.setting;
        let value;
        if (el.type === 'checkbox') value = el.checked;
        else if (el.type === 'number') value = Number(el.value);
        else value = el.value;
        setState((st) => { st.settings[key] = value; });
        if (key === 'pollRate') connection.setPollRate(value);
        if (key === 'units') build();
      });
    });

    view.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeChoice;
        setState((st) => { st.theme = theme; });
        applyTheme(theme);
        build();
      });
    });

    view.querySelectorAll('[data-units]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setState((st) => { st.settings.units = btn.dataset.units; });
        build();
      });
    });

    view.querySelector('#setHudBtn')?.addEventListener('click', async () => {
      const { toggleHud } = await import('./hud.js');
      toggleHud(true);
    });

    view.querySelector('#setTripsBtn')?.addEventListener('click', () => { location.hash = '#/trips'; });

    view.querySelector('#setExportBtn')?.addEventListener('click', () => {
      const stamp = new Date().toISOString().slice(0, 10);
      download(`autopulse-backup-${stamp}.json`, exportState());
      toast('Backup exported', { message: 'Keep the JSON file somewhere safe.', type: 'ok' });
    });

    view.querySelector('#setImportBtn')?.addEventListener('click', async () => {
      const file = await pickFile();
      if (!file) return;
      try {
        importState(file.text);
        applyTheme(getState().theme);
        toast('Backup imported', { message: file.name, type: 'ok' });
        build();
      } catch (err) {
        toast('Import failed', { message: err.message || 'The file is not a valid backup.', type: 'err' });
      }
    });

    view.querySelector('#setInstallBtn')?.addEventListener('click', async () => {
      const prompt = window.__apInstallPrompt;
      if (!prompt) return;
      prompt.prompt();
      try {
        const choice = await prompt.userChoice;
        if (choice?.outcome === 'accepted') toast('Installing AutoPulse', { type: 'ok' });
      } catch { /* ignore */ }
      window.__apInstallPrompt = null;
      build();
    });

    view.querySelector('#setDtcUpdateBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const res = await fetch(`data/dtc-pack.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const pack = await res.json();
        const info = applyDtcPack(pack);
        toast('Code library updated', {
          message: `${info.count} codes · pack ${info.packVersion || info.version}`,
          type: 'ok',
        });
        build();
      } catch (err) {
        toast('Could not update the code library', {
          message: navigator.onLine === false
            ? 'You are offline. The built-in library still works.'
            : (err.message || 'Download failed.'),
          type: 'warn',
        });
      } finally {
        btn.disabled = false;
      }
    });

    view.querySelector('#setResetBtn')?.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Erase all local data?',
        message: 'Every vehicle, trip, dashboard, performance result and setting will be deleted from this browser. Export a backup first if you need it.',
        okLabel: 'Erase everything',
        danger: true,
        iconName: 'trash',
      });
      if (!ok) return;
      resetState();
      applyTheme(getState().theme);
      connection.setPollRate(getState().settings.pollRate);
      toast('All data erased', { message: 'AutoPulse has been restored to defaults.', type: 'ok' });
      build();
    });
  };

  build();
  return () => {};
};

const connect = async (mode, done) => {
  try {
    if (mode === 'demo') {
      await connection.connectDemo(activeVehicle());
      toast('Demo vehicle connected', { message: 'Live data is streaming from the simulator.', type: 'ok' });
    } else if (mode === 'serial') {
      await connection.connectSerial({ baudRate: Number(getState().settings.serialBaud) });
      toast('Serial adapter connected', { message: connection.info.adapter, type: 'ok' });
    } else {
      await connection.connectBluetooth();
      toast('Bluetooth adapter connected', { message: connection.info.adapter, type: 'ok' });
    }
  } catch (err) {
    toast('Connection failed', { message: err.message || 'Could not open the adapter.', type: 'err', timeout: 6500 });
  } finally {
    if (done) done();
  }
};

export const openConnectionModal = (onChange) => {
  const serial = isSerialSupported();
  const bluetooth = isBluetoothSupported();
  const connected = connection.status === 'connected';
  const info = connection.info;

  const api = modal({
    title: 'Connection setup',
    subtitle: 'Choose the offline demo or connect a real ELM327 adapter.',
    wide: true,
    body: `
      <div class="stack">
        <div class="callout">
          ${icon('info')}<div>
            <b>Demo vehicle</b> runs entirely in this browser with a physics-based drive cycle, temperatures, fuel consumption, DTCs and readiness monitors. It works offline and is the best way to explore every screen.
          </div>
        </div>

        <div class="settings-group">
          <h3>Offline demo</h3>
          <div class="settings-row">
            <div class="sr-text">
              <b>Simulated ELM327 · demo vehicle</b>
              <span>A realistic 1.4 TSI with automatic city/highway driving, manual throttle and brake control.</span>
            </div>
            <div class="sr-control">
              <button class="btn btn-sm ${connection.mode === 'demo' && connected ? 'btn-primary' : ''}" id="connDemoBtn" type="button">${icon('play')}<span>${connection.mode === 'demo' && connected ? 'Connected' : 'Connect demo'}</span></button>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <h3>Real hardware</h3>
          <div class="settings-row">
            <div class="sr-text">
              <b>USB serial ELM327</b>
              <span>${serial ? 'Web Serial is available. Use Chrome or Edge on desktop with a USB OBD-II cable.' : 'Web Serial is not available in this browser. Use Chrome or Edge on desktop.'}</span>
            </div>
            <div class="sr-control">
              <button class="btn btn-sm" id="connSerialBtn" type="button" ${serial ? '' : 'disabled'}>${icon('usb')}<span>Connect USB</span></button>
            </div>
          </div>
          <div class="settings-row">
            <div class="sr-text">
              <b>Bluetooth ELM327</b>
              <span>${bluetooth ? (isNativeApp() ? 'Android Bluetooth is available. Scans for BLE ELM327 adapters and connects directly.' : 'Web Bluetooth is available. Requires HTTPS or localhost and a BLE OBD-II adapter.') : 'Web Bluetooth is not available here. Requires Chrome or Edge over HTTPS or localhost.'}</span>
            </div>
            <div class="sr-control">
              <button class="btn btn-sm" id="connBleBtn" type="button" ${bluetooth ? '' : 'disabled'}>${icon('bluetooth')}<span>Connect Bluetooth</span></button>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <h3>Adapter information</h3>
          <div style="padding:4px 15px 10px">
            <div class="kv"><span class="k">Status</span><span class="v"><span class="chip ${statusChipClass()}">${statusLabel()}</span></span></div>
            <div class="kv"><span class="k">Adapter</span><span class="v">${escapeHtml(info.adapter || '—')}</span></div>
            <div class="kv"><span class="k">Firmware</span><span class="v">${escapeHtml(info.firmware || '—')}</span></div>
            <div class="kv"><span class="k">Protocol</span><span class="v" style="font-size:10.5px">${escapeHtml(info.protocol || '—')}</span></div>
            <div class="kv"><span class="k">Mode</span><span class="v">${escapeHtml(connection.mode)}</span></div>
          </div>
        </div>

        ${connected ? `<button class="btn btn-sm btn-ghost" id="connDisconnectBtn" type="button" style="align-self:flex-start">${icon('power')}<span>Disconnect adapter</span></button>` : ''}
        <div class="callout warn">${icon('alert')}<div>Never connect or disconnect an adapter while driving. Real hardware reads are read-only; clearing codes and service routines can change vehicle state.</div></div>
      </div>`,
    actions: [{ label: 'Close', kind: 'primary' }],
    onMount: (m) => {
      const finish = () => {
        m.close();
        if (onChange) onChange();
      };
      m.body.querySelector('#connDemoBtn')?.addEventListener('click', async () => {
        await connect('demo');
        finish();
      });
      m.body.querySelector('#connSerialBtn')?.addEventListener('click', async () => {
        await connect('serial');
        finish();
      });
      m.body.querySelector('#connBleBtn')?.addEventListener('click', async () => {
        await connect('bluetooth');
        finish();
      });
      m.body.querySelector('#connDisconnectBtn')?.addEventListener('click', async () => {
        await connection.disconnect();
        toast('Disconnected', { type: 'info' });
        finish();
      });
    },
  });
  return api;
};
