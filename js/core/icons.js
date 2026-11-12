/* AutoPulse OBD2 — inline SVG icon set */

const P = {
  gauge: '<path d="M12 14l3.5-4.5"/><path d="M4.5 18a8.5 8.5 0 1 1 15 0"/><circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none"/>',
  pulse: '<path d="M2.5 12h4l2.2-6 4 12 2.6-7 1.6 3h4.6"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4L12 3.5Z"/><path d="M12 9v4.5"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-1.7 3.5L16 11H5"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.8 2.8 0 1 1-4-4l8.5-8.5a4 4 0 0 0-1-1Z"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
  car: '<path d="m4 16 1.4-5.2A2.5 2.5 0 0 1 7.8 9h8.4a2.5 2.5 0 0 1 2.4 1.8L20 16"/><path d="M3 16h18v3.5h-2.5V18h-13v1.5H3Z"/><circle cx="7" cy="13.5" r=".8" fill="currentColor" stroke="none"/><circle cx="17" cy="13.5" r=".8" fill="currentColor" stroke="none"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  hud: '<path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M7.5 12h2l1.5-3 2 6 1.5-3h2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  play: '<path d="M7 4.5v15l12-7.5Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M6.5 7h5"/><path d="M14 9h2.5a2 2 0 0 1 2 2v6a1.8 1.8 0 0 0 3.5 0V9l-2.5-3"/>',
  temp: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z"/><circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  battery: '<rect x="2.5" y="7.5" width="17" height="9" rx="2"/><path d="M21.5 10.5v3"/><path d="M6 10.5v3M9 10.5v3"/>',
  speed: '<path d="M12 14l4-5"/><path d="M4.5 18a8.5 8.5 0 1 1 15 0"/><path d="M6 18h12"/>',
  engine: '<path d="M4 10h2V8h5l2 2h3V8h2v2h2v7h-2v2h-3l-2-2H6v-2H4Z"/><path d="M9 8V6h5v2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-.7 4.5"/><path d="M20 5v6h-6"/>',
  save: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>',
  bluetooth: '<path d="m7 7 10 10-5 4V3l5 4L7 17"/>',
  usb: '<path d="M12 3v13"/><path d="m9 6 3-3 3 3"/><circle cx="12" cy="18" r="2"/><path d="M12 13H8v-2M12 11h4V9"/>',
  'chevron-left': '<path d="m14.5 5-7 7 7 7"/>',
  'chevron-right': '<path d="m9.5 5 7 7-7 7"/>',
  'chevron-down': '<path d="m5 9.5 7 7 7-7"/>',
  dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  expand: '<path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.9 7.5-9.5V6Z"/><path d="m8.5 12 2.4 2.4 4.6-5"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14 2.5-7h5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  droplet: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l2.5 1.5M9.5 2h5"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1 8 4.5-2.5 4.5 2.5-1-8"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  unlock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 7.6-1.7"/>',
  eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a2 2 0 0 0-2 2v9"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0Z"/><path d="M12 17v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  'arrow-up': '<path d="M12 20V4"/><path d="m5.5 10.5 6.5-6.5 6.5 6.5"/>',
  'arrow-down': '<path d="M12 4v16"/><path d="m5.5 13.5 6.5 6.5 6.5-6.5"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  thermometer: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z"/>',
  oil: '<path d="M3 15h9l3 3h6v-4h-4l-3-3H8L6 9H3Z"/><path d="M8 9V6h4l2 3"/>',
  gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  cable: '<path d="M4 8V4M8 8V4M3 8h6v3a3 3 0 0 1-6 0Z"/><path d="M6 14v3a4 4 0 0 0 4 4h4"/><rect x="14" y="17" width="6" height="4" rx="1.5"/>',
  link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4 0l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4L11 6.1"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4 0l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/>',
  power: '<path d="M12 3v9"/><path d="M6.4 6.4a8 8 0 1 0 11.2 0"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none"/>',
  'file': '<path d="M6 2.5h8l4 4v15H6Z"/><path d="M14 2.5v4h4"/>',
  'external': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  'steering': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V21M9.6 11 3.2 9.5M14.4 11l6.4-1.5"/>',
  'parking': '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  'filter': '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
  'sunrise': '<path d="M12 3v5M5 10l1.5 1.5M19 10l-1.5 1.5M2 18h20M6 14a6 6 0 0 1 12 0"/><path d="M2 22h20"/>',
  'mountain': '<path d="m3 20 6-11 4 7 2.5-4L21 20Z"/>',
  'github': '<path d="M9 19c-4 1.2-4-2-5.5-2.5M15 21v-3.4a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 2.2 5.8 2.5 5.8 2.5a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 4.4 9c0 4.8 3 5.9 5.8 6.2A3 3 0 0 0 9.5 17V21"/>',
};

export const iconNames = Object.keys(P);

export const svgIcon = (name) => {
  const body = P[name] || P.info;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
};

export const icon = (name, cls = '') =>
  `<span class="ico${cls ? ` ${cls}` : ''}" data-icon="${name}">${svgIcon(name)}</span>`;

export const hydrateIcons = (root = document) => {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (!el.dataset.hydrated) {
      el.innerHTML = svgIcon(name);
      el.dataset.hydrated = '1';
    }
  });
};
