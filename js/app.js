/* AutoPulse OBD2 — application bootstrap and hash router */

import { getState, subscribe, activeVehicle } from './core/store.js';
import { hydrateIcons } from './core/icons.js';
import { initTripRecorder } from './core/trips.js';
import { connection } from './obd/connection.js';
import { toast } from './ui/components.js';
import { applyTheme, openConnectionModal } from './ui/settings.js';
import { toggleHud } from './ui/hud.js';

import * as dashboardScreen from './ui/dashboard.js';
import * as liveScreen from './ui/live.js';
import * as diagnosticsScreen from './ui/diagnostics.js';
import * as tripsScreen from './ui/trips.js';
import * as performanceScreen from './ui/performance.js';
import * as serviceScreen from './ui/service.js';
import * as terminalScreen from './ui/terminal.js';
import * as garageScreen from './ui/garage.js';
import * as settingsScreen from './ui/settings.js';

const routes = {
  dashboard: { title: 'Dashboard', sub: 'Live vehicle telemetry', render: dashboardScreen.render },
  live: { title: 'Live data', sub: 'Every sensor the ECU exposes', render: liveScreen.render },
  diagnostics: { title: 'Diagnostics', sub: 'Trouble codes and emissions readiness', render: diagnosticsScreen.render },
  trips: { title: 'Trips', sub: 'Distance, fuel and cost logging', render: tripsScreen.render },
  performance: { title: 'Performance', sub: 'Timed acceleration and braking runs', render: performanceScreen.render },
  service: { title: 'Service & coding', sub: 'Maintenance routines and adaptations', render: serviceScreen.render },
  terminal: { title: 'Terminal', sub: 'Raw ELM327 commands', render: terminalScreen.render },
  garage: { title: 'Garage', sub: 'Vehicle profiles', render: garageScreen.render },
  settings: { title: 'Settings', sub: 'Connection and app preferences', render: settingsScreen.render },
};

let cleanup = null;
let currentRoute = '';
let lastVehicleId = '';

const $ = (id) => document.getElementById(id);

const setStatus = () => {
  const status = connection.status;
  const isDemo = connection.mode === 'demo';
  const connected = status === 'connected';
  const label = connected ? (isDemo ? 'Demo' : 'Live') : status === 'connecting' ? 'Connecting' : status === 'error' ? 'Error' : 'Offline';
  const dotClass = status === 'error' ? 'err' : connected ? (isDemo ? 'demo' : '') : 'off';

  const topText = $('topStatusText');
  const topDot = $('topStatusDot');
  const sideText = $('sideStatusText');
  const sideDot = $('sideStatusDot');
  const sideAdapter = $('sideAdapterText');
  const sideBtn = $('sideConnectBtn');

  if (topText) topText.textContent = label;
  if (topDot) topDot.className = `status-dot ${dotClass}`.trim();
  if (sideDot) sideDot.className = `status-dot ${dotClass}`.trim();
  if (sideText) {
    sideText.textContent = connected
      ? (isDemo ? 'Demo vehicle' : 'Adapter connected')
      : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Connection error' : 'Disconnected';
  }
  if (sideAdapter) {
    sideAdapter.textContent = connected
      ? `${connection.info.adapter} · ${connection.info.firmware}`
      : connection.error || 'Demo available offline';
  }
  if (sideBtn) sideBtn.textContent = connected ? 'Manage connection' : 'Connection setup';
};

const setVehiclePill = () => {
  const v = activeVehicle();
  const el = $('vehiclePillText');
  if (el) el.textContent = v?.name || `${v?.make || ''} ${v?.model || ''}`.trim() || 'No vehicle';
};

const routeName = () => {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0];
  return routes[raw] ? raw : 'dashboard';
};

const renderRoute = () => {
  const name = routeName();
  const route = routes[name];
  if (!route) return;

  if (cleanup) {
    try { cleanup(); } catch (err) { console.warn('AutoPulse: screen cleanup failed', err); }
    cleanup = null;
  }

  document.body.classList.remove('nav-open');
  currentRoute = name;

  document.querySelectorAll('[data-route]').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === name);
  });

  const title = $('pageTitle');
  const sub = $('pageSub');
  if (title) title.textContent = route.title;
  if (sub) sub.textContent = route.sub;
  document.title = `${route.title} · AutoPulse OBD2`;

  const view = $('view');
  if (!view) return;
  view.innerHTML = '';
  try {
    cleanup = route.render(view) || null;
  } catch (err) {
    console.error('AutoPulse: failed to render screen', name, err);
    view.innerHTML = `<div class="empty"><b>This screen failed to load</b><p>${String(err?.message || err)}</p><button class="btn btn-primary btn-sm" onclick="location.reload()">Reload app</button></div>`;
  }
  hydrateIcons(document);
  setStatus();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
};

const bindChrome = () => {
  $('menuBtn')?.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });

  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('nav-open')) return;
    if (e.target.closest('#sidebar') || e.target.closest('#menuBtn')) return;
    document.body.classList.remove('nav-open');
  });

  $('sideConnectBtn')?.addEventListener('click', () => openConnectionModal());
  $('connPill')?.addEventListener('click', () => openConnectionModal());
  $('vehiclePill')?.addEventListener('click', () => { location.hash = '#/garage'; });
  $('hudBtn')?.addEventListener('click', () => toggleHud());

  document.querySelectorAll('.sidebar .nav a, .mobile-nav a').forEach((a) => {
    a.addEventListener('click', () => document.body.classList.remove('nav-open'));
  });

  window.addEventListener('hashchange', renderRoute);
};

const bindInstall = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__apInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('autopulse:installable'));
  });
  window.addEventListener('appinstalled', () => {
    window.__apInstallPrompt = null;
    toast('AutoPulse installed', { message: 'It now runs as a standalone offline app.', type: 'ok' });
  });
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('AutoPulse: service worker registration failed', err);
    });
  });
};

const bindStore = () => {
  lastVehicleId = getState().activeVehicleId;
  applyTheme(getState().theme);

  subscribe((state) => {
    applyTheme(state.theme);
    setVehiclePill();
    if (state.activeVehicleId !== lastVehicleId) {
      lastVehicleId = state.activeVehicleId;
      connection.setVehicle(activeVehicle());
    }
  });
};

const boot = () => {
  hydrateIcons(document);
  bindChrome();
  bindInstall();
  bindStore();
  registerServiceWorker();
  initTripRecorder();

  connection.setPollRate(getState().settings.pollRate);
  connection.setVehicle(activeVehicle());
  setVehiclePill();
  setStatus();
  connection.on('status', setStatus);

  if (!location.hash) {
    history.replaceState(null, '', '#/dashboard');
  }
  renderRoute();

  if (getState().settings.autoConnectDemo) {
    connection.connectDemo(activeVehicle()).catch((err) => {
      console.warn('AutoPulse: demo auto-connect failed', err);
      toast('Demo unavailable', { message: err.message, type: 'err' });
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
