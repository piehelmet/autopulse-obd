/* AutoPulse OBD2 — vehicle presets, connection profiles, service and coding catalogues */

export const VEHICLE_PRESETS = [
  {
    label: 'Volkswagen Golf 1.4 TSI (2021)',
    make: 'Volkswagen', model: 'Golf 1.4 TSI', year: 2021, fuel: 'Gasoline', tank: 55,
    vin: 'WVWZZZAUZMW000001',
  },
  {
    label: 'Toyota Corolla 1.8 Hybrid (2022)',
    make: 'Toyota', model: 'Corolla 1.8 Hybrid', year: 2022, fuel: 'Hybrid gasoline', tank: 43,
    vin: 'JTDBR32E900000002',
  },
  {
    label: 'Renault Clio 1.0 TCe (2021)',
    make: 'Renault', model: 'Clio 1.0 TCe', year: 2021, fuel: 'Gasoline', tank: 42,
    vin: 'VF1RJA00000000003',
  },
  {
    label: 'Ford F-150 3.5 EcoBoost (2020)',
    make: 'Ford', model: 'F-150 3.5 EcoBoost', year: 2020, fuel: 'Gasoline', tank: 98,
    vin: '1FTEW1E0000000004',
  },
  {
    label: 'BMW 320d (2019)',
    make: 'BMW', model: '320d', year: 2019, fuel: 'Diesel', tank: 59,
    vin: 'WBA5E510000000005',
  },
  {
    label: 'Tesla Model 3 (2023) — limited OBD',
    make: 'Tesla', model: 'Model 3', year: 2023, fuel: 'Electric', tank: 0,
    vin: '5YJ3E1EA000000006',
  },
];

export const CONNECTION_PROFILES = [
  { id: 'generic', name: 'Generic OBD-II', protocol: 'Auto (ISO 15765-4 CAN)', note: 'Works with any ELM327-compatible adapter.' },
  { id: 'vag', name: 'VAG / Volkswagen Group', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds VAG measuring blocks and coding when supported.' },
  { id: 'toyota', name: 'Toyota / Lexus', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Toyota-specific PIDs and customization.' },
  { id: 'renault', name: 'Renault / Dacia', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Renault ECU diagnostics and coding.' },
  { id: 'ford', name: 'Ford / Lincoln', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Ford-specific modules.' },
  { id: 'gm', name: 'GM / Chevrolet / Opel', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds GM-specific modules.' },
  { id: 'bmw', name: 'BMW / Mini', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds BMW-specific modules.' },
  { id: 'mercedes', name: 'Mercedes-Benz', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Mercedes-specific modules.' },
  { id: 'hyundai', name: 'Hyundai / Kia', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Hyundai/Kia-specific modules.' },
  { id: 'psa', name: 'Peugeot / Citroën / DS / Opel', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds PSA-specific modules.' },
  { id: 'fca', name: 'Fiat / Alfa Romeo / Jeep', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds FCA-specific modules.' },
  { id: 'honda', name: 'Honda / Acura', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Honda-specific modules.' },
  { id: 'nissan', name: 'Nissan / Infiniti', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Nissan-specific modules.' },
  { id: 'mazda', name: 'Mazda', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Mazda-specific modules.' },
  { id: 'subaru', name: 'Subaru', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Subaru-specific modules.' },
  { id: 'volvo', name: 'Volvo', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Volvo-specific modules.' },
  { id: 'mitsubishi', name: 'Mitsubishi', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds Mitsubishi-specific modules.' },
  { id: 'jlr', name: 'Jaguar / Land Rover', protocol: 'ISO 15765-4 CAN 11-bit 500 kbps', note: 'Adds JLR-specific modules.' },
];

export const SERVICE_FUNCTIONS = [
  {
    id: 'oil_reset', name: 'Oil service reset', icon: 'oil', module: 'Instrument cluster',
    desc: 'Reset the oil change interval and service reminder after an oil change.',
    duration: 2200, engineOff: false,
  },
  {
    id: 'service_reset', name: 'Service interval reset', icon: 'clock', module: 'Instrument cluster',
    desc: 'Reset the distance/time based service interval counter.',
    duration: 2400, engineOff: false,
  },
  {
    id: 'epb_release', name: 'Electric parking brake — service mode', icon: 'parking', module: 'ABS / EPB',
    desc: 'Retract the rear calipers for pad replacement. Always support the vehicle first.',
    duration: 4200, engineOff: true, danger: true,
  },
  {
    id: 'dpf_regen', name: 'DPF forced regeneration', icon: 'wind', module: 'Engine ECU',
    desc: 'Request a stationary regeneration of the diesel particulate filter. Engine must be warm.',
    duration: 6500, engineOff: false, danger: true,
  },
  {
    id: 'throttle_relearn', name: 'Throttle body relearn', icon: 'engine', module: 'Engine ECU',
    desc: 'Relearn the throttle plate closed and open positions after cleaning or replacement.',
    duration: 3600, engineOff: true,
  },
  {
    id: 'sas_calibration', name: 'Steering angle sensor calibration', icon: 'steering', module: 'ABS / ESP',
    desc: 'Zero the steering angle sensor after alignment or steering column work. Vehicle must be level.',
    duration: 3000, engineOff: false,
  },
  {
    id: 'abs_bleed', name: 'ABS brake bleed', icon: 'droplet', module: 'ABS / ESP',
    desc: 'Cycle the ABS pump and valves to purge air after brake hydraulic work.',
    duration: 7000, engineOff: true, danger: true,
  },
  {
    id: 'battery_reg', name: 'Battery registration', icon: 'battery', module: 'Body / Power management',
    desc: 'Register a new battery capacity and chemistry so charging strategy is correct.',
    duration: 2600, engineOff: false,
  },
  {
    id: 'injector_coding', name: 'Injector coding', icon: 'code', module: 'Engine ECU',
    desc: 'Write injector correction values after replacing a diesel injector.',
    duration: 3200, engineOff: true, danger: true,
  },
  {
    id: 'trans_adapt', name: 'Transmission adaptation reset', icon: 'cog', module: 'Transmission',
    desc: 'Clear learned shift adaptations and begin a new learning cycle.',
    duration: 2800, engineOff: false,
  },
  {
    id: 'tpms_reset', name: 'TPMS sensor learn', icon: 'gps', module: 'Body / TPMS',
    desc: 'Put the TPMS module into learn mode for new wheel sensors.',
    duration: 3000, engineOff: false,
  },
  {
    id: 'scr_reset', name: 'SCR / AdBlue reset', icon: 'droplet', module: 'Engine ECU',
    desc: 'Reset the DEF consumption counter and clear the refill warning.',
    duration: 2500, engineOff: false,
  },
];

export const CODING_BRANDS = [
  {
    id: 'vag', name: 'Volkswagen / Audi / Škoda / Seat', protocol: 'UDS / VAG',
    modules: [
      {
        id: 'bcm', name: 'Central electrics (BCM)', address: '09',
        functions: [
          { id: 'needle_sweep', name: 'Instrument needle sweep', desc: 'Sweep gauges on ignition on.', def: false },
          { id: 'cornering', name: 'Cornering lights', desc: 'Use fog lights as cornering lamps.', def: true },
          { id: 'drl_menu', name: 'DRL settings in MIB menu', desc: 'Expose daytime running light settings.', def: true },
          { id: 'comfort_windows', name: 'Comfort window operation', desc: 'Remote key opens/closes windows.', def: true },
          { id: 'mirror_fold', name: 'Folding mirrors on lock', desc: 'Fold mirrors when locking the car.', def: false },
          { id: 'auto_lock', name: 'Auto-lock above 15 km/h', desc: 'Lock doors when driving away.', def: true },
        ],
      },
      {
        id: 'engine', name: 'Engine ECU', address: '01',
        functions: [
          { id: 'start_stop_off', name: 'Start/stop default off', desc: 'Remember the last start/stop state.', def: false },
          { id: 'throttle_response', name: 'Sharper throttle response', desc: 'Change pedal map to direct.', def: false },
          { id: 'sound_actuator', name: 'Sound actuator level', desc: 'Interior engine sound intensity.', def: true },
        ],
      },
      {
        id: 'abs', name: 'ABS / ESP', address: '03',
        functions: [
          { id: 'xds', name: 'Extended differential lock', desc: 'Electronic diff lock strength.', def: true },
          { id: 'hill_hold', name: 'Hill hold assist', desc: 'Hold brakes briefly on incline.', def: true },
        ],
      },
    ],
  },
  {
    id: 'toyota', name: 'Toyota / Lexus', protocol: 'UDS / Toyota',
    modules: [
      {
        id: 'bcm', name: 'Body control', address: '09',
        functions: [
          { id: 'auto_lock', name: 'Auto door lock by speed', desc: 'Lock doors above 20 km/h.', def: true },
          { id: 'remote_windows', name: 'Remote window control', desc: 'Open windows with key fob.', def: false },
          { id: 'welcome_light', name: 'Welcome lighting', desc: 'Interior lights fade in on unlock.', def: true },
          { id: 'seatbelt_chime', name: 'Seat belt chime', desc: 'Enable or disable reminder chime.', def: true },
        ],
      },
      {
        id: 'engine', name: 'Engine ECU', address: '01',
        functions: [
          { id: 'eco_mode', name: 'ECO mode default', desc: 'Start in ECO drive mode.', def: false },
          { id: 'idle_up', name: 'Idle-up for accessories', desc: 'Raise idle when electrical load is high.', def: true },
        ],
      },
    ],
  },
  {
    id: 'renault', name: 'Renault / Dacia', protocol: 'UDS / Renault',
    modules: [
      {
        id: 'bcm', name: 'UPC / body control', address: '09',
        functions: [
          { id: 'auto_lock', name: 'Auto door lock by speed', desc: 'Lock doors when driving.', def: true },
          { id: 'cornering', name: 'Cornering fog lights', desc: 'Fog light follows steering input.', def: false },
          { id: 'drl', name: 'Daytime running lights', desc: 'Enable DRL output.', def: true },
        ],
      },
      {
        id: 'engine', name: 'Engine ECU', address: '01',
        functions: [
          { id: 'start_stop_off', name: 'Start/stop default off', desc: 'Remember last start/stop state.', def: false },
          { id: 'throttle_response', name: 'Throttle pedal map', desc: 'Comfort or dynamic pedal response.', def: true },
        ],
      },
    ],
  },
];

export const DEMO_FREEZE_FRAME = {
  rpm: 2148,
  speed: 42,
  coolant: 89,
  intake: 31,
  load: 38,
  throttle: 17,
  maf: 8.4,
  fuelLevel: 62,
  voltage: 13.9,
  fuelRate: 3.1,
};

export const MODE06_DEMO = [
  { id: 'misfire_cyl1', name: 'Misfire count — cylinder 1', value: 0, min: 0, max: 50, unit: 'count', status: 'pass' },
  { id: 'misfire_cyl2', name: 'Misfire count — cylinder 2', value: 2, min: 0, max: 50, unit: 'count', status: 'pass' },
  { id: 'misfire_cyl3', name: 'Misfire count — cylinder 3', value: 0, min: 0, max: 50, unit: 'count', status: 'pass' },
  { id: 'misfire_cyl4', name: 'Misfire count — cylinder 4', value: 0, min: 0, max: 50, unit: 'count', status: 'pass' },
  { id: 'cat_b1', name: 'Catalyst monitor bank 1', value: 0.71, min: 0.6, max: 1, unit: 'ratio', status: 'pass' },
  { id: 'o2_b1s1', name: 'O2 sensor response bank 1 sensor 1', value: 0.83, min: 0.5, max: 1, unit: 'ratio', status: 'pass' },
  { id: 'o2_b1s2', name: 'O2 sensor response bank 1 sensor 2', value: 0.78, min: 0.5, max: 1, unit: 'ratio', status: 'pass' },
  { id: 'evap', name: 'EVAP system leak check', value: 0.94, min: 0.5, max: 1, unit: 'ratio', status: 'pass' },
  { id: 'egr', name: 'EGR flow monitor', value: 0.88, min: 0.5, max: 1, unit: 'ratio', status: 'pass' },
  { id: 'purge', name: 'EVAP purge valve', value: 0.66, min: 0.5, max: 1, unit: 'ratio', status: 'pass' },
];

export const PROTOCOLS = [
  'Auto',
  'ISO 15765-4 CAN (11-bit, 500 kbps)',
  'ISO 15765-4 CAN (29-bit, 500 kbps)',
  'ISO 9141-2',
  'ISO 14230-4 KWP (5 baud)',
  'ISO 14230-4 KWP (fast)',
  'SAE J1850 PWM',
  'SAE J1850 VPW',
];

export const BAUD_RATES = [9600, 38400, 57600, 115200, 230400, 500000];
