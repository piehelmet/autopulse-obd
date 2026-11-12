/* AutoPulse OBD2 — native (Capacitor) bridge loader.
 *
 * On GitHub Pages this module is inert: window.Capacitor does not exist, so
 * nothing is imported and the Web Bluetooth path is used instead.
 * Inside the Android build, ./native-ble.bundle.js is present and wraps the
 * @capacitor-community/bluetooth-le plugin, which talks to the Android BLE
 * stack directly — no Chrome and no Web Bluetooth API involved.
 */

export const isNativeApp = () => {
  try {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
};

let modulePromise = null;

export function loadNativeBle() {
  if (!isNativeApp()) return Promise.reject(new Error('Native Bluetooth is only available in the Android app'));
  if (!modulePromise) modulePromise = import('./native-ble.bundle.js');
  return modulePromise;
}
