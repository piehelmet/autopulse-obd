# AutoPulse OBD2

AutoPulse OBD2 is an original, offline-capable OBD-II diagnostics app built as a Progressive Web App. It talks to real ELM327-compatible adapters over **Web Serial** or **Web Bluetooth**, and it ships with a full physics-based **demo vehicle** so every screen can be explored without hardware.

The project is an independent reimplementation of the feature set of the supplied `com.ovz.carscanner` APK. It uses no APK assets, code, names or artwork.

---

## Quick start

### Use the hosted app

Open **<https://piehelmet.github.io/autopulse-obd/>** in Chrome or Edge. Install it from the browser menu (**Install app** / **Add to Home screen**) to run it as a standalone offline app.

### Install the Android APK

Download **[AutoPulse-OBD2-1.3.0.apk](https://github.com/piehelmet/autopulse-obd/releases/download/v1.3.0/AutoPulse-OBD2-1.3.0.apk)** and open it on an Android 7.0+ phone. Allow installs from your browser or file manager when prompted.

The APK is a self-contained native app. Every asset is bundled inside it, so it works with no internet connection at all — even on first launch. It does **not** use the Chrome app, has no URL bar, and does not depend on GitHub Pages being reachable. Bluetooth ELM327 adapters are reached through the Android Bluetooth LE stack directly.

> Technical note: the UI is rendered by the system Android WebView (Chromium-based), which is a standard Android component — the same engine used by many native apps. The Chrome browser itself is never launched or required.

Requires Android 7.0 (API 24) or newer.

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
4. Choose **Connect USB** (desktop browser) or **Connect Bluetooth**.
5. Select the adapter in the picker. AutoPulse runs the ELM327 handshake and starts polling.

How the Bluetooth picker appears depends on where you run the app:

| Platform | Bluetooth path |
| --- | --- |
| Android APK | Native Android Bluetooth LE scan dialog. Grant the Bluetooth/location permission the first time. |
| Hosted PWA in Chrome/Edge | Web Bluetooth device chooser (requires HTTPS or localhost). |

> Web Serial is desktop-only. Web Bluetooth requires a BLE adapter and a secure context. Classic Bluetooth ELM327 adapters are not exposed by the Web Bluetooth API.

---

## Feature parity

| Car Scanner / APK capability | AutoPulse status | Notes |
| --- | --- | --- |
| Read stored, pending and permanent DTCs | Implemented | Mode 03 / 07 / 0A, generic code descriptions for ~90 codes plus fallback descriptions. Additional descriptions can be downloaded from the code library. |
| Read TCM, ABS and airbag module codes | Experimental | Direct physical addressing on 11-bit CAN (7E0–7E7 request / 7E8–7EF response) with UDS `19 02` or KWP2000 `18 02`, plus a Mode 03 fallback. Read-only. Depends on the adapter's multi-frame support and the vehicle's module map. |
| Clear DTCs and reset readiness | Implemented | Mode 04 with confirmation and safety warnings. Module-specific clearing is not implemented. |
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
| Dark / light / classic theme, metric / imperial units | Implemented | Persisted locally. Classic swaps the gauges for analogue dials with a warm instrument-panel palette. |
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
- **Diagnostics** — generic scan, clear, code details, freeze frame, Mode 06, readiness monitors, and an experimental TCM/ABS/SRS module scan.
- **Trips** — background recorder, live stats, saved trip history and charts.
- **Performance** — staged tests, automatic timing, personal bests and result history.
- **Service & coding** — 12 guided service routines and manufacturer coding catalogues (clearly marked simulated).
- **Terminal** — raw ELM327 command console with logging.
- **Garage** — vehicle profiles, presets and active vehicle selection.
- **Settings** — connection setup, polling, units, theme (dark, light, classic analogue), HUD metrics, fuel price, code-library updates, backup/restore and data erase.

### Themes

The theme picker in **Settings → Units & display** offers three looks:

- **Dark** — the default high-contrast night palette.
- **Light** — bright daylight palette.
- **Classic** — warm walnut and brass instrument-panel palette with analogue gauges: cream dial faces, chrome bezels, serif numerals, a red needle and an odometer-style digital readout. The choice is saved with the rest of the app state.

### Diagnostic code library

Descriptions ship inside the app, so scanning works with no network. The bundled `data/dtc-pack.json` is applied automatically on first launch, and again when a release ships a newer numeric pack version. **Settings → Diagnostic code library → Check for updates** re-downloads the pack on demand, so descriptions can be refreshed without reinstalling the app. The installed pack is stored locally, takes precedence over the built-in text, and survives restarts; a custom pack with a non-numeric version is never overwritten automatically. If the download fails or the device is offline, the bundled or stored library keeps working.

Pack entries can carry optional `make`, `model` and `module` fields. Lookups score those fields against the active vehicle and the module that reported the code, so a Toyota-specific P2714 description is never shown for a Dodge, and a generic P0730 still resolves everywhere. The shipped pack includes U760E entries for the 2011 Camry and 62TE entries for the 2008 Grand Caravan.

### Experimental module scan

**Diagnostics → Scan all modules** asks the TCM, ABS and airbag controllers for their codes directly. It pauses live polling, switches the adapter to 11-bit 500 kbps CAN, sets the physical request/receive headers, tries UDS `19 02 FF`, then KWP2000 `18 02 FF`, then a generic Mode 03 fallback. After the scan it resets the adapter and re-applies the normal polling settings.

This is read-only and clearly marked experimental. Generic OBD-II still reads only the **engine control module (ECM/PCM)**. Module addresses vary between models, and clone ELM327 v1.5 firmware often cannot reassemble multi-frame CAN replies; a module that does not answer may still be healthy. Use a manufacturer scan tool for module-specific clearing, adaptations and service functions.

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
   ├─ obd/                    simulator, serial/BLE transports, ELM327 connection, module scan
   └─ ui/                     one module per screen + shared components/charts/HUD
```

- No runtime dependencies, no build step, no tracking.
- Vanilla ES modules and canvas.
- State is persisted in `localStorage` under `autopulse.state.v1`.
- Every screen exports `render(view)` and returns a cleanup function used by the router.
- `js/obd/native-ble.js` is inert on the web and loads `native-ble.bundle.js` only inside the Android shell.

### Android packaging

The APK is built from a separate Capacitor project that copies this folder into its
`www/` directory and bundles the native BLE plugin. The web app remains the single
source of truth: rebuild the APK after changing anything here.

---

## Limitations and disclosures

- **Not affiliated** with Car Scanner, ELM Electronics, any vehicle manufacturer or the authors of the original APK.
- **Coding and several service routines are simulations.** They show the workflow but do not write to a real vehicle. Applying coding is blocked outside demo mode.
- **Generic OBD-II is the baseline.** Mode 22 custom PIDs work if the ECU supports them. The experimental module scan can read TCM, ABS and airbag codes on some 11-bit CAN vehicles, but it is not a replacement for OEM diagnostics. Manufacturer adaptations, security access and module-specific clearing are not implemented.
- **Module scan is best-effort.** Address maps are presets, not guarantees. A module may use a different address, a different diagnostic service, or a 29-bit CAN layout. ELM327 v1.5 clones may truncate multi-frame responses. The scan is read-only and never writes coding or adaptations.
- **DTC descriptions are updatable, not live.** The built-in library and the downloadable code pack are maintained with app releases; the app never silently fetches code data in the background.
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
