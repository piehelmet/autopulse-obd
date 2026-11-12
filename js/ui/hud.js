/* AutoPulse OBD2 — mirrored head-up display */

import { getState } from '../core/store.js';
import { getPid } from '../data/pids.js';
import { displayPid } from '../core/display.js';
import { connection } from '../obd/connection.js';

let visible = false;
let unsubData = null;

const overlay = () => document.getElementById('hudOverlay');

const onKey = (e) => {
  if (e.key === 'Escape' && visible) {
    e.preventDefault();
    toggleHud(false);
  }
};

const update = (values) => {
  const el = overlay();
  if (!el || !visible || !values) return;
  const s = getState();
  const primary = getPid(s.settings.hudPrimary) || getPid('speed');
  const secondary = getPid(s.settings.hudSecondary) || getPid('rpm');

  const p = displayPid(primary, values[primary.key]);
  const sec = displayPid(secondary, values[secondary.key]);

  const pVal = el.querySelector('[data-hud="primary-value"]');
  const pUnit = el.querySelector('[data-hud="primary-label"]');
  const sVal = el.querySelector('[data-hud="secondary-value"]');
  const sUnit = el.querySelector('[data-hud="secondary-label"]');

  if (pVal) pVal.textContent = p.text;
  if (pUnit) pUnit.textContent = `${primary.short} · ${p.unit}`;
  if (sVal) sVal.textContent = sec.text;
  if (sUnit) sUnit.textContent = `${secondary.short} · ${sec.unit}`;
};

export const toggleHud = (force) => {
  const el = overlay();
  if (!el) return visible;
  visible = force === undefined ? !visible : Boolean(force);

  if (visible) {
    el.hidden = false;
    el.innerHTML = `
      <div class="hud-inner">
        <div class="hud-metric">
          <b data-hud="primary-value">—</b>
          <span data-hud="primary-label">Speed</span>
        </div>
        <div class="hud-metric">
          <b data-hud="secondary-value">—</b>
          <span data-hud="secondary-label">RPM</span>
        </div>
      </div>
      <div class="hud-hint">Tap anywhere or press Esc to exit HUD</div>`;
    el.addEventListener('click', hide);
    document.addEventListener('keydown', onKey);
    unsubData = connection.on('data', update);
    update(connection.values);
  } else {
    hide();
  }
  return visible;
};

const hide = () => {
  const el = overlay();
  if (!el) return;
  el.hidden = true;
  el.innerHTML = '';
  el.removeEventListener('click', hide);
  document.removeEventListener('keydown', onKey);
  if (unsubData) {
    unsubData();
    unsubData = null;
  }
  visible = false;
};

export const isHudVisible = () => visible;
