/* AutoPulse OBD2 — performance tests */

import { getState, setState, addPerfResult, activeVehicle } from '../core/store.js';
import { imperial, units, formatSpeed, formatDistance } from '../core/display.js';
import { icon } from '../core/icons.js';
import { pageHead, toast, confirmDialog, emptyState } from './components.js';
import { connection } from '../obd/connection.js';
import { escapeHtml, fmtDate, round, clamp } from '../core/utils.js';

const QUARTER_MILE = 402.336;

const testsForUnits = () => {
  const imp = imperial();
  if (imp) {
    return [
      { id: '0-60mph', label: '0–60 mph', short: '0–60', kind: 'accel', target: 96.56, desc: 'Launch from standstill and accelerate to 60 mph.' },
      { id: '0-100mph', label: '0–100 mph', short: '0–100', kind: 'accel', target: 160.93, desc: 'Launch from standstill and accelerate to 100 mph.' },
      { id: '60-100mph', label: '60–100 mph', short: '60–100', kind: 'roll', from: 96.56, to: 160.93, desc: 'Rolling acceleration in gear. Timing starts at 60 mph.' },
      { id: 'quarter', label: '1/4 mile', short: '1/4 mi', kind: 'distance', targetM: QUARTER_MILE, desc: 'Standing start over 402 metres.' },
      { id: '60-0mph', label: '60–0 mph', short: '60–0', kind: 'brake', from: 96.56, desc: 'Reach 60 mph and brake firmly to a stop.' },
    ];
  }
  return [
    { id: '0-60', label: '0–60 km/h', short: '0–60', kind: 'accel', target: 60, desc: 'Launch from standstill and accelerate to 60 km/h.' },
    { id: '0-100', label: '0–100 km/h', short: '0–100', kind: 'accel', target: 100, desc: 'Launch from standstill and accelerate to 100 km/h.' },
    { id: '60-120', label: '60–120 km/h', short: '60–120', kind: 'roll', from: 60, to: 120, desc: 'Rolling acceleration in gear. Timing starts at 60 km/h.' },
    { id: 'quarter', label: '1/4 mile', short: '1/4 mi', kind: 'distance', targetM: QUARTER_MILE, desc: 'Standing start over 402 metres.' },
    { id: '100-0', label: '100–0 km/h', short: '100–0', kind: 'brake', from: 100, desc: 'Reach 100 km/h and brake firmly to a stop.' },
  ];
};

export const render = (view) => {
  const tests = testsForUnits();
  let selected = tests[0];
  let phase = 'idle'; // idle | countdown | waiting | launch | brakeWait | running | done
  let countdownEnd = 0;
  let runStart = 0;
  let lastSpeed = 0;
  let lastTs = 0;
  let distanceM = 0;
  let splits = {};
  let result = null;
  let ticker = null;
  let currentSpeed = 0;
  let maxSpeedRun = 0;

  const testLabel = () => selected.label;

  const statusText = () => {
    if (phase === 'idle') return 'Ready';
    if (phase === 'countdown') return 'Staging';
    if (phase === 'waiting') return 'Waiting for speed';
    if (phase === 'launch') return 'Waiting for launch';
    if (phase === 'brakeWait') return 'Brake now';
    if (phase === 'running') return 'Recording';
    return 'Complete';
  };

  const build = () => {
    const s = getState();
    const u = units();
    const results = s.perfResults || [];
    const best = {};
    results.forEach((r) => {
      if (!best[r.testId] || r.value < best[r.testId].value) best[r.testId] = r;
    });

    view.innerHTML = `
      ${pageHead('Performance', 'Timed acceleration and braking runs using live vehicle speed.', `
        <button class="btn btn-sm btn-ghost" id="perfClearBtn" type="button" ${results.length ? '' : 'disabled'}>${icon('trash')}<span>Clear results</span></button>
      `)}

      <div class="dash-toolbar">
        <div class="segmented" id="perfTests">
          ${tests.map((t) => `<button type="button" data-test="${t.id}" class="${t.id === selected.id ? 'active' : ''}">${escapeHtml(t.short)}</button>`).join('')}
        </div>
        <span class="chip ${phase === 'running' ? 'danger' : phase === 'done' ? 'ok' : 'info'}" id="perfStatus">${statusText()}</span>
      </div>

      <div class="card glow" style="margin-bottom:16px">
        <div class="perf-stage">
          <div class="perf-sub">${escapeHtml(testLabel())}</div>
          <div class="perf-time" id="perfTime">${result && phase === 'done' ? result.value.toFixed(2) : '0.00'}</div>
          <div class="perf-speed"><span id="perfSpeed">${formatSpeed(currentSpeed)}</span> <small style="font-size:12px;color:var(--muted)">${u.speed}</small></div>
          <div class="progress" style="width:min(420px,90%);margin-top:6px"><i id="perfProgress" style="width:0%"></i></div>
          <p class="small muted" id="perfHint" style="max-width:520px;text-align:center;margin-top:4px">${escapeHtml(hintText())}</p>
          <div class="row" style="gap:8px;margin-top:6px">
            <button class="btn ${phase === 'running' || phase === 'countdown' ? 'btn-danger' : 'btn-primary'}" id="perfActionBtn" type="button">
              ${icon(phase === 'running' || phase === 'countdown' ? 'stop' : 'flag')}
              <span>${phase === 'running' || phase === 'countdown' ? 'Cancel run' : phase === 'done' ? 'Run again' : 'Start test'}</span>
            </button>
            ${phase !== 'idle' && phase !== 'done' ? `<button class="btn" id="perfResetBtn" type="button">${icon('refresh')}<span>Reset</span></button>` : ''}
          </div>
          ${result && phase === 'done' ? `
            <div class="perf-result" style="margin-top:12px">
              ${result.splits?.[60] !== undefined ? `<div><b>${result.splits[60].toFixed(2)}</b><span>0–60 ${u.speed === 'mph' ? 'mph' : 'km/h'}</span></div>` : ''}
              ${result.splits?.[100] !== undefined ? `<div><b>${result.splits[100].toFixed(2)}</b><span>0–100 ${u.speed === 'mph' ? 'mph' : 'km/h'}</span></div>` : ''}
              <div><b>${formatSpeed(result.maxSpeedKmh)}</b><span>Max ${u.speed}</span></div>
              ${result.distanceM ? `<div><b>${formatDistance(result.distanceM / 1000, 3)}</b><span>${u.distance}</span></div>` : ''}
            </div>` : ''}
        </div>
      </div>

      <div class="between" style="margin-bottom:10px">
        <h3 style="font-size:14px">Results</h3>
        <span class="chip info">${results.length} saved</span>
      </div>
      ${results.length ? `
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Test</th><th class="num">Time</th><th>Vehicle</th><th>Source</th><th>Date</th></tr></thead>
            <tbody>
              ${results.map((r) => `<tr>
                <td>${escapeHtml(r.label || r.testId)} ${best[r.testId]?.id === r.id ? '<span class="badge accent">PB</span>' : ''}</td>
                <td class="num">${Number(r.value).toFixed(2)} s</td>
                <td>${escapeHtml(r.vehicleName || 'Vehicle')}</td>
                <td><span class="chip ${r.mode === 'demo' ? 'info' : 'accent'}">${escapeHtml(r.mode === 'demo' ? 'Demo' : 'OBD')}</span></td>
                <td class="small muted">${escapeHtml(fmtDate(r.createdAt))}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : emptyState('flag', 'No performance runs yet', 'Choose a test, then start a run. Results are stored on this device and can be compared over time.')}
      <div class="callout warn" style="margin-top:14px">${icon('alert')}<div>Only run performance tests on a closed road or track. Obey speed limits and never operate the app while driving — use a passenger or HUD mode.</div></div>`;

    bind();
    refreshStage();
  };

  const hintText = () => {
    if (phase === 'countdown') return 'Staging — hold the brake. The run begins when the vehicle starts moving.';
    if (phase === 'waiting' && selected.kind === 'roll') return `Accelerate to ${selected.from} ${units().speed}. Timing starts automatically.`;
    if (phase === 'waiting' && selected.kind === 'brake') return `Accelerate to ${selected.from} ${units().speed}, then brake firmly.`;
    if (phase === 'launch') return 'Go! Timing starts as soon as the vehicle moves.';
    if (phase === 'brakeWait') return 'Brake now — timing starts when speed begins to drop.';
    if (phase === 'running') return selected.kind === 'distance' ? 'Hold full throttle until the quarter mile is complete.' : 'Keep going — the run ends automatically.';
    if (phase === 'done') return `Run complete. ${selected.kind === 'brake' ? 'Shorter is better.' : 'Lower times are better.'}`;
    return selected.desc;
  };

  const bind = () => {
    view.querySelectorAll('#perfTests [data-test]').forEach((b) => {
      b.addEventListener('click', () => {
        if (phase === 'running' || phase === 'countdown') cancelRun(true);
        selected = tests.find((t) => t.id === b.dataset.test) || tests[0];
        phase = 'idle';
        result = null;
        splits = {};
        distanceM = 0;
        build();
      });
    });
    view.querySelector('#perfActionBtn')?.addEventListener('click', () => {
      if (phase === 'running' || phase === 'countdown' || phase === 'waiting' || phase === 'launch' || phase === 'brakeWait') cancelRun();
      else startRun();
    });
    view.querySelector('#perfResetBtn')?.addEventListener('click', () => cancelRun());
    view.querySelector('#perfClearBtn')?.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Clear all performance results?',
        message: 'Every saved run will be deleted from this device.',
        okLabel: 'Clear results', danger: true,
      });
      if (!ok) return;
      setState((st) => { st.perfResults = []; });
      toast('Results cleared', { type: 'ok' });
      build();
    });
  };

  const startRun = () => {
    if (connection.status !== 'connected') {
      toast('Not connected', { message: 'Connect to the demo vehicle or an adapter first.', type: 'warn' });
      return;
    }
    const speed = Number(connection.values.speed) || 0;
    if (selected.kind === 'accel' && speed > 4) {
      toast('Slow to a stop', { message: 'Acceleration tests start from standstill.', type: 'warn' });
      return;
    }
    if (selected.kind === 'brake' && speed > selected.from + 15) {
      toast('Slow down', { message: `Reach ${selected.from} ${units().speed} to begin the braking test.`, type: 'warn' });
      return;
    }

    result = null;
    splits = {};
    distanceM = 0;
    maxSpeedRun = 0;
    lastSpeed = speed;
    lastTs = Date.now();
    currentSpeed = speed;

    if (connection.mode === 'demo') {
      connection.setDemoAuto(false);
      connection.demoCoast();
      if (selected.kind === 'accel') connection.demoReset();
    }

    if (selected.kind === 'accel') {
      phase = 'countdown';
      countdownEnd = Date.now() + 3000;
    } else if (selected.kind === 'roll') {
      phase = 'waiting';
      if (connection.mode === 'demo') connection.demoLaunch();
    } else if (selected.kind === 'brake') {
      phase = 'waiting';
      if (connection.mode === 'demo') connection.demoLaunch();
    }
    refreshStage();
  };

  const cancelRun = (silent = false) => {
    phase = 'idle';
    result = null;
    splits = {};
    distanceM = 0;
    if (connection.mode === 'demo') connection.demoCoast();
    if (!silent) toast('Run cancelled', { type: 'info' });
    refreshStage();
  };

  const beginTiming = (now) => {
    runStart = now;
    lastTs = now;
    phase = 'running';
    splits = {};
    distanceM = 0;
    maxSpeedRun = lastSpeed;
    refreshStage();
  };

  const finish = (elapsed, extra = {}) => {
    phase = 'done';
    const u = units();
    const value = Math.max(0.01, elapsed);
    result = {
      testId: selected.id,
      label: selected.label,
      value: round(value, 2),
      maxSpeedKmh: maxSpeedRun,
      splits: { ...splits },
      distanceM: selected.kind === 'distance' ? QUARTER_MILE : distanceM,
      vehicleName: activeVehicle() ? `${activeVehicle().make} ${activeVehicle().model}` : 'Vehicle',
      mode: connection.mode,
      ...extra,
    };
    addPerfResult(result);
    if (connection.mode === 'demo') connection.demoCoast();
    toast('Run recorded', { message: `${selected.label}: ${value.toFixed(2)} s`, type: 'ok' });
    refreshStage();
    buildResultsOnly();
  };

  // Update just the results table without rebuilding the stage
  const buildResultsOnly = () => {
    const s = getState();
    const results = s.perfResults || [];
    const wrap = view.querySelector('.table-wrap');
    if (!wrap) { build(); return; }
    // Simplest reliable approach: rebuild everything but keep phase/result
    build();
  };

  const onData = (values) => {
    const now = Date.now();
    const speed = Math.max(0, Number(values.speed) || 0);
    currentSpeed = speed;
    if (phase === 'running') maxSpeedRun = Math.max(maxSpeedRun, speed);

    if (phase === 'countdown') {
      const left = (countdownEnd - now) / 1000;
      setStageTime(left > 0 ? left.toFixed(1) : '0.0');
      if (left <= 0) {
        phase = 'launch';
        lastSpeed = speed;
        lastTs = now;
        if (connection.mode === 'demo') connection.demoLaunch();
        refreshStage();
      }
    }

    if (phase === 'waiting') {
      if (selected.kind === 'roll' && speed >= selected.from) beginTiming(now);
      if (selected.kind === 'brake' && speed >= selected.from - 1) {
        phase = 'brakeWait';
        if (connection.mode === 'demo') {
          connection.demoCoast();
          connection.setDemoBrake(100);
        }
        refreshStage();
      }
    }

    if (phase === 'launch' && speed > 0.8) beginTiming(now);

    if (phase === 'brakeWait' && speed < selected.from - 2) beginTiming(now);

    if (phase === 'running') {
      const dt = lastTs ? clamp((now - lastTs) / 1000, 0, 2) : 0;
      if (selected.kind === 'distance') {
        distanceM += (((lastSpeed + speed) / 2) / 3.6) * dt;
      }
      const elapsed = (now - runStart) / 1000;

      // splits for acceleration runs
      if (selected.kind === 'accel' || selected.kind === 'distance') {
        const splitDefs = imperial()
          ? [{ key: 60, speed: 96.56 }, { key: 100, speed: 160.93 }]
          : [{ key: 60, speed: 60 }, { key: 100, speed: 100 }];
        splitDefs.forEach(({ key, speed: threshold }) => {
          if (splits[key] === undefined && speed >= threshold && lastSpeed < threshold) {
            const frac = (threshold - lastSpeed) / (speed - lastSpeed || 1);
            splits[key] = Math.max(0, elapsed - (1 - frac) * dt);
          }
        });
      }

      if (selected.kind === 'distance') {
        if (distanceM >= QUARTER_MILE) {
          const prevDist = distanceM - (((lastSpeed + speed) / 2) / 3.6) * dt;
          const frac = (QUARTER_MILE - prevDist) / (distanceM - prevDist || 1);
          finish(elapsed - (1 - frac) * dt);
        }
      } else if (selected.kind === 'accel' && speed >= selected.target) {
        const frac = (selected.target - lastSpeed) / (speed - lastSpeed || 1);
        finish(elapsed - (1 - frac) * dt);
      } else if (selected.kind === 'roll' && speed >= selected.to) {
        const frac = (selected.to - lastSpeed) / (speed - lastSpeed || 1);
        finish(elapsed - (1 - frac) * dt);
      } else if (selected.kind === 'brake' && speed <= 1) {
        const frac = (lastSpeed - 1) / (lastSpeed - speed || 1);
        finish(elapsed - (1 - frac) * dt);
      }
    }

    lastSpeed = speed;
    lastTs = now;
    refreshStage();
  };

  const setStageTime = (text) => {
    const el = view.querySelector('#perfTime');
    if (el) el.textContent = text;
  };

  const refreshStage = () => {
    const t = view.querySelector('#perfTime');
    const sp = view.querySelector('#perfSpeed');
    const pr = view.querySelector('#perfProgress');
    const hint = view.querySelector('#perfHint');
    const status = view.querySelector('#perfStatus');
    if (!t) return;

    let displayTime = '0.00';
    if (phase === 'running') displayTime = ((Date.now() - runStart) / 1000).toFixed(2);
    else if (phase === 'countdown') displayTime = Math.max(0, (countdownEnd - Date.now()) / 1000).toFixed(1);
    else if (phase === 'done' && result) displayTime = result.value.toFixed(2);
    t.textContent = displayTime;
    if (sp) sp.textContent = formatSpeed(currentSpeed);
    if (hint) hint.textContent = hintText();
    if (status) {
      status.textContent = statusText();
      status.className = `chip ${phase === 'running' ? 'danger' : phase === 'done' ? 'ok' : 'info'}`;
    }

    let pct = 0;
    if (phase === 'running') {
      if (selected.kind === 'accel') pct = (currentSpeed / selected.target) * 100;
      else if (selected.kind === 'roll') pct = ((currentSpeed - selected.from) / (selected.to - selected.from)) * 100;
      else if (selected.kind === 'distance') pct = (distanceM / QUARTER_MILE) * 100;
      else if (selected.kind === 'brake') pct = (1 - currentSpeed / selected.from) * 100;
    } else if (phase === 'done') pct = 100;
    if (pr) pr.style.width = `${clamp(pct, 0, 100)}%`;
  };

  ticker = setInterval(() => {
    if (phase === 'running') refreshStage();
  }, 50);

  const unsub = connection.on('data', onData);
  build();
  refreshStage();

  return () => {
    clearInterval(ticker);
    unsub();
    if (connection.mode === 'demo') connection.demoCoast();
  };
};
