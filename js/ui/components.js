/* AutoPulse OBD2 — modal, toast and small UI building blocks */

import { icon, hydrateIcons } from '../core/icons.js';
import { escapeHtml, uid } from '../core/utils.js';

const modalRoot = () => document.getElementById('modalRoot');
const toastRoot = () => document.getElementById('toastRoot');

const modalStack = [];

const onKey = (e) => {
  if (e.key === 'Escape' && modalStack.length) {
    e.preventDefault();
    modalStack[modalStack.length - 1].close();
  }
};

export const closeAllModals = () => {
  [...modalStack].forEach((m) => m.close());
};

export const modal = ({
  title = '',
  subtitle = '',
  body = '',
  actions = [],
  wide = false,
  narrow = false,
  onMount = null,
  onClose = null,
  dismissible = true,
} = {}) => {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const id = uid('modal');
  backdrop.innerHTML = `
    <div class="modal${wide ? ' wide' : ''}${narrow ? ' narrow' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="modal-head">
        <div>
          <h3 id="${id}-title">${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${dismissible ? `<button class="modal-close" type="button" aria-label="Close">${icon('close')}</button>` : ''}
      </div>
      <div class="modal-body"></div>
      ${actions.length ? '<div class="modal-foot"></div>' : ''}
    </div>`;
  const modalEl = backdrop.querySelector('.modal');
  const bodyEl = backdrop.querySelector('.modal-body');
  const footEl = backdrop.querySelector('.modal-foot');

  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  hydrateIcons(bodyEl);
  hydrateIcons(backdrop.querySelector('.modal-head'));

  let closed = false;
  const api = {
    root: backdrop,
    modal: modalEl,
    body: bodyEl,
    close(result) {
      if (closed) return;
      closed = true;
      const i = modalStack.indexOf(api);
      if (i >= 0) modalStack.splice(i, 1);
      backdrop.remove();
      if (!modalStack.length) document.removeEventListener('keydown', onKey);
      if (onClose) onClose(result);
    },
  };

  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : a.kind === 'ghost' ? 'btn-ghost' : ''}`;
    btn.innerHTML = `${a.icon ? icon(a.icon) : ''}<span>${escapeHtml(a.label)}</span>`;
    btn.addEventListener('click', async () => {
      if (a.onClick) {
        const result = await a.onClick(api);
        if (result === false) return;
      }
      if (a.close !== false) api.close();
    });
    footEl.appendChild(btn);
  });

  const closeBtn = backdrop.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => api.close());
  if (dismissible) {
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) api.close();
    });
  }

  modalRoot().appendChild(backdrop);
  modalStack.push(api);
  document.addEventListener('keydown', onKey);
  if (onMount) onMount(api);

  setTimeout(() => {
    const focusable = modalEl.querySelector('input, select, textarea, button.btn-primary, button');
    if (focusable) focusable.focus({ preventScroll: true });
  }, 40);

  return api;
};

export const confirmDialog = ({
  title = 'Are you sure?',
  message = '',
  okLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  iconName = 'alert',
} = {}) =>
  new Promise((resolve) => {
    let answered = false;
    const api = modal({
      title,
      narrow: true,
      body: `<div class="callout${danger ? ' danger' : ''}">${icon(iconName)}<div>${escapeHtml(message)}</div></div>`,
      actions: [
        { label: cancelLabel, onClick: () => { answered = true; resolve(false); } },
        {
          label: okLabel,
          kind: danger ? 'danger' : 'primary',
          onClick: () => { answered = true; resolve(true); },
        },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
    return api;
  });

export const toast = (title, { message = '', type = 'info', timeout = 3800 } = {}) => {
  const root = toastRoot();
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ico = type === 'ok' ? 'check' : type === 'err' ? 'alert' : type === 'warn' ? 'alert' : 'info';
  el.innerHTML = `${icon(ico, 't-ico')}<div><b>${escapeHtml(title)}</b>${message ? `<span>${escapeHtml(message)}</span>` : ''}</div>`;
  hydrateIcons(el);
  root.appendChild(el);
  const remove = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 180);
  };
  el.addEventListener('click', remove);
  setTimeout(remove, timeout);
  while (root.children.length > 4) root.firstElementChild.remove();
  return el;
};

export const pageHead = (title, subtitle = '', actions = '') => `
  <div class="page-head">
    <div>
      <h2>${escapeHtml(title)}</h2>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </div>`;

export const emptyState = (iconName, title, text = '', action = '') => `
  <div class="empty">
    ${icon(iconName)}
    <b>${escapeHtml(title)}</b>
    ${text ? `<p>${escapeHtml(text)}</p>` : ''}
    ${action}
  </div>`;

export const kv = (label, value) => `
  <div class="kv"><span class="k">${escapeHtml(label)}</span><span class="v">${value}</span></div>`;

export const spinner = (label = 'Working…') => `
  <div class="row" style="gap:10px;color:var(--muted);font-size:12px">
    <span class="loader"></span><span>${escapeHtml(label)}</span>
  </div>`;

export const field = (label, control, hint = '') => `
  <div class="field">
    <label>${escapeHtml(label)}</label>
    ${control}
    ${hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ''}
  </div>`;

export const tabs = (items, active) => `
  <div class="tabs">
    ${items.map((t) => `
      <button type="button" data-tab="${t.id}" class="${t.id === active ? 'active' : ''}">
        ${t.icon ? icon(t.icon) : ''}<span>${escapeHtml(t.label)}</span>
      </button>`).join('')}
  </div>`;

export const mountTabs = (root, onChange) => {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      onChange(btn.dataset.tab);
    });
  });
};
