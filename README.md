# AutoPulse OBD2

AutoPulse OBD2 is an original, offline-capable OBD-II diagnostics app built as a Progressive Web App. It talks to real ELM327-compatible adapters over **Web Serial** or **Web Bluetooth**, and it ships with a full physics-based **demo vehicle** so every screen can be explored without hardware.

The project is an independent reimplementation of the feature set of the supplied `com.ovz.carscanner` APK. It uses no APK assets, code, names or artwork.

---

## Quick start

### Use the hosted app

Open the GitHub Pages URL for this repository in Chrome or Edge. Install it from the browser menu (**Install app** / **Add to Home screen**) to run it as a standalone offline app.

### Run locally

```powershell
cd autopulse-obd
python -m http.server 8080
```

Open <http://localhost:8080>. Service workers, Web Bluetooth and Web Serial all work on localhost. Opening `index.html` directly with `file://` works for the demo, but the service worker and Web Bluetooth will not.

### Connect a real car

1. Plug an ELM327-compatible adapter into the OBD-II port.
2. Turn the ignition on (engine running is recommended for live data).
3. Open **Connection setup** in the sidebar or top bar.
4. Choose **Connect USB** (Chrome/Edge desktop) or **Connect Bluetooth** (Chrome/Edge over HTTPS or localhost).
5. Select the adapter in the browser picker. AutoPulse runs the ELM327 handshake and starts polling.

> Web Serial is desktop-only. Web Bluetooth requires a BLE adapter and a secure context. Classic Bluetooth ELM327 adapters are not exposed by the Web Bluetooth API.

---

## Feature parity

| Car Scanner / APK capability | AutoPulse status | Notes |
| --- | --- | --- |
| Read stored, pending and permanent DTCs | Implemented | Mode 03 / 07 / 0A, generic code descriptions for ~90 codes plus fallback descriptions. |
| Clear DTCs and reset readiness | Implemented | Mode 04 with confirmation and safety warnings. |
| Freeze frame | Implemented | Demo data and Mode 02 reads on real adapters. |
| Readiness monitors / MIL status | Implemented | Mode 01 PID 01 decoding. |
| Mode 06 on-board monitor results | Implemented (demo) | Real Mode 06 values are manufacturer-specific; generic adapters often return nothing. |
| Live sensor data | Implemented | ~30 standard Mode 01 PIDs with correct decoding, unit conversion and rolling history. |
| Custom dashboards / pages / widgets | Implemented | Gauges, large numbers, bars and line charts; multiple pages; editable layout. |
| Favorites and sensor search | Implemented | Filter by category, favorites and text. |
| Custom PIDs | Implemented | Mode 01 or Mode 22 with A/B/C/D formulas. |
| Trip computer | Implemented | Distance, fuel used, cost, average/max speed, idle time, speed and fuel charts. |
| Automatic trip recording | Implemented | Starts on movement, stops after a long idle. |
| Performance tests | Implemented | 0–60/0–100 km/h or 0–60/0–100 mph, rolling runs, 1/4 mile, braking tests with interpolation. |
| Service functions (oil reset, EPB, DPF, ABS bleed, etc.) | Demo-simulated | Full UI and guided routines; no OEM write commands are sent to a real vehicle. |
| Manufacturer coding / long coding | Demo-simulated | VAG, Toyota and Renault catalogues are demonstration data. Real coding needs licensed OEM protocols. |
| Raw ELM327 terminal | Implemented | AT and OBD commands, history, quick commands, copy/save log. |
| Vehicle profiles / garage | Implemented | Presets, VIN, tank, odometer, notes and per-vehicle trip stats. |
| HUD / mirrored display | Implemented | Configurable primary and secondary metric. |
| Dark / light theme, metric / imperial units | Implemented | Persisted locally. |
| Local backup / restore | Implemented | Full JSON export and import. |
| Offline use | Implemented | Service worker precaches the complete app. |
| Cloud sync / account | Not implemented | Everything is local by design; export JSON for backup. |
| CarPlay / Android Auto | Not implemented | The PWA can be installed on a phone, but not projected to the car head unit. |
| Wi-Fi ELM327 | Not implemented | Web Serial and Web Bluetooth only. A WebSocket bridge could be added. |
| Huge OEM DTC / actuator database | Limited | Generic SAE descriptions and a demo catalogue; no licensed OEM data. |
| GPS logging, video, acceleration graphs | Not implemented | Speed comes from the ECU. |
| iOS support for hardware | Limited | Safari does not implement Web Serial/Web Bluetooth. The demo and all local features still work. |

---

## What is included

- **Dashboard** — KPI cards, range/fuel/battery estimates, editable widget grid, demo drive controls.
- **Live data** — searchable sensor table, sparklines, favorites, custom PID editor.
- **Diagnostics** — scan, clear, code details, freeze frame, Mode 06, readiness monitors.
- **Trips** — background recorder, live stats, saved trip history and charts.
- **Performance** — staged tests, automatic timing, personal bests and result history.
- **Service & coding** — 12 guided service routines and manufacturer coding catalogues (clearly marked simulated).
- **Terminal** — raw ELM327 command console with logging.
- **Garage** — vehicle profiles, presets and active vehicle selection.
- **Settings** — connection setup, polling, units, theme, HUD metrics, fuel price, backup/restore and data erase.

---

## Architecture

```
autopulse-obd/
├─ index.html                 App shell
├─ manifest.webmanifest       PWA manifest
├─ sw.js                      Offline precache service worker
├─ css/styles.css             Design system and responsive layout
├─ assets/                    Original SVG + generated PNG icons
└─ js/
   ├─ app.js                  Bootstrap, router, status chrome
   ├─ core/                   utils, icons, store, display, history, trip recorder
   ├─ data/                   PIDs, DTCs, vehicle presets, service/coding catalogues
   ├─ obd/                    simulator, serial/BLE transports, ELM327 connection
   └─ ui/                     one module per screen + shared components/charts/HUD
```

- No runtime dependencies, no build step, no tracking.
- Vanilla ES modules and canvas.
- State is persisted in `localStorage` under `autopulse.state.v1`.
- Every screen exports `render(view)` and returns a cleanup function used by the router.

---

## Limitations and disclosures

- **Not affiliated** with Car Scanner, ELM Electronics, any vehicle manufacturer or the authors of the original APK.
- **Coding and several service routines are simulations.** They show the workflow but do not write to a real vehicle. Applying coding is blocked outside demo mode.
- **Generic OBD-II only for real hardware.** Mode 22 custom PIDs work if the ECU supports them. Manufacturer-specific modules, adaptations and security access are not implemented.
- **Web Bluetooth cannot see classic Bluetooth adapters.** Use a BLE ELM327 or a USB serial cable.
- **Fuel economy** is derived from the ECU fuel-rate PID when available; otherwise estimates are less accurate.
- **Readiness and Mode 06** depend on the vehicle and adapter. Some ECUs return nothing for generic requests.
- **Performance timing** uses ECU speed samples and interpolation. It is indicative, not a calibrated timing device.
- **Safety:** never operate the app while driving. Performance tests only on closed roads. Service functions can affect safety systems. Clearing codes does not repair faults.

---

## Privacy

All data — vehicles, trips, dashboards, results and settings — stays in the browser's local storage. Nothing is uploaded. Backups are files you create and control. The app has no analytics, accounts or network calls other than loading its own static files.

---

## License

MIT. See [LICENSE](LICENSE).
