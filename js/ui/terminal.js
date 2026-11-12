/* AutoPulse OBD2 — raw command terminal */

import { getState, activeVehicle } from '../core/store.js';
import { icon } from '../core/icons.js';
import { pageHead, toast } from './components.js';
import { connection } from '../obd/connection.js';
import { download, escapeHtml, fmtClock } from '../core/utils.js';

const QUICK = ['ATZ', 'ATI', 'ATDP', 'ATRV', '0100', '010C', '010D', '0105', '03', '0902'];

export const render = (view) => {
  const lines = [];
  let history = [];
  let historyIdx = -1;

  view.innerHTML = `
    ${pageHead('Terminal', 'Send raw ELM327 AT commands and OBD-II requests, then read the adapter response.', `
      <button class="btn btn-sm" id="termCopyBtn" type="button">${icon('copy')}<span>Copy</span></button>
      <button class="btn btn-sm" id="termSaveBtn" type="button">${icon('download')}<span>Save log</span></button>
      <button class="btn btn-sm btn-ghost" id="termClearBtn" type="button">${icon('trash')}<span>Clear</span></button>
    `)}

    <div class="terminal">
      <div class="terminal-bar">
        <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <span class="small muted" style="margin-left:6px">${escapeHtml(connection.info.adapter || 'ELM327')} · ${escapeHtml(connection.info.protocol || 'Auto')}</span>
        <span class="grow"></span>
        <span class="chip ${connection.status === 'connected' ? 'ok' : 'warn'}">${escapeHtml(connection.status)}</span>
      </div>
      <div class="terminal-out" id="termOut" aria-live="polite"></div>
      <div class="terminal-in">
        <input type="text" id="termInput" placeholder="Type a command, e.g. 010C — press Enter" autocomplete="off" spellcheck="false" />
        <button class="btn btn-primary btn-sm" id="termSendBtn" type="button">${icon('play')}<span>Send</span></button>
      </div>
    </div>

    <div class="row wrap" style="margin-top:10px;gap:6px">
      ${QUICK.map((c) => `<button class="btn btn-xs" type="button" data-quick="${c}">${c}</button>`).join('')}
      <span class="grow"></span>
      <span class="tiny muted">↑ / ↓ recalls command history</span>
    </div>
    <div class="callout" style="margin-top:14px">${icon('terminal')}<div>
      Commands are sent verbatim. <b>AT</b> commands configure the adapter; <b>01</b> reads live PIDs; <b>03</b> reads trouble codes. In demo mode the simulator answers with realistic responses. Avoid unknown manufacturer commands on a real vehicle.
    </div></div>`;

  const out = view.querySelector('#termOut');
  const input = view.querySelector('#termInput');

  const addLine = (dir, text, at = Date.now()) => {
    const cls = dir === 'tx' ? 'tx' : dir === 'rx' ? 'rx' : dir === 'err' ? 'err' : 'sys';
    const prefix = dir === 'tx' ? '→' : dir === 'rx' ? '←' : dir === 'err' ? '!' : '·';
    const div = document.createElement('div');
    div.innerHTML = `<span class="sys">${fmtClock(at)}</span> <span class="${cls}">${prefix} ${escapeHtml(text)}</span>`;
    out.appendChild(div);
    while (out.children.length > 600) out.firstElementChild.remove();
    out.scrollTop = out.scrollHeight;
  };

  addLine('sys', `AutoPulse terminal · ${connection.mode === 'demo' ? 'demo vehicle' : 'live adapter'}`);
  addLine('sys', `Adapter: ${connection.info.adapter} · ${connection.info.protocol}`);
  if (connection.status !== 'connected') addLine('err', 'Not connected — connect an adapter or the demo vehicle first.');

  const send = async () => {
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    history = [cmd, ...history.filter((h) => h !== cmd)].slice(0, 40);
    historyIdx = -1;
    if (connection.status !== 'connected') {
      addLine('err', 'Not connected. Open Connection setup and connect first.');
      return;
    }
    try {
      await connection.query(cmd);
    } catch (err) {
      addLine('err', err.message || 'Command failed');
    }
  };

  view.querySelector('#termSendBtn')?.addEventListener('click', send);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length) {
        historyIdx = Math.min(history.length - 1, historyIdx + 1);
        input.value = history[historyIdx] || '';
        input.setSelectionRange(input.value.length, input.value.length);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        historyIdx -= 1;
        input.value = history[historyIdx] || '';
      } else {
        historyIdx = -1;
        input.value = '';
      }
    }
  });

  view.querySelectorAll('[data-quick]').forEach((b) => {
    b.addEventListener('click', () => {
      input.value = b.dataset.quick;
      send();
    });
  });

  view.querySelector('#termClearBtn')?.addEventListener('click', () => {
    out.innerHTML = '';
    addLine('sys', 'Log cleared');
  });

  view.querySelector('#termCopyBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(out.innerText);
      toast('Log copied', { type: 'ok' });
    } catch {
      toast('Copy failed', { message: 'Clipboard access was blocked.', type: 'err' });
    }
  });

  view.querySelector('#termSaveBtn')?.addEventListener('click', () => {
    const v = activeVehicle();
    download(`autopulse-terminal-${Date.now()}.txt`, `AutoPulse OBD2 terminal log\nVehicle: ${v?.make || ''} ${v?.model || ''}\nAdapter: ${connection.info.adapter}\n\n${out.innerText}\n`, 'text/plain');
    toast('Log saved', { type: 'ok' });
  });

  const unsubLog = connection.on('log', ({ dir, text, at }) => {
    addLine(dir, text, at);
  });

  const unsubStatus = connection.on('status', ({ status }) => {
    addLine('sys', `Connection status: ${status}`);
  });

  setTimeout(() => input?.focus(), 60);

  return () => {
    unsubLog();
    unsubStatus();
  };
};
