// Flat, minimalist line icons as inline SVG. No emoji anywhere in the UI. Every icon is a
// 24x24 stroke glyph drawn in currentColor, so it inherits text colour and theme. The
// domain refers to icons by name (see domain/icons.ts); the UI renders them here.

export type IconName =
  // chrome / actions
  | "menu" | "back" | "close" | "check" | "trash" | "plus" | "minus" | "clock" | "flag"
  | "undo" | "sync" | "user" | "users" | "grid" | "home" | "checklist" | "cart" | "qr"
  // grocery categories
  | "leaf" | "apple" | "grain" | "spice" | "milk" | "drop" | "bread" | "cup" | "jar"
  | "candy" | "soap" | "broom" | "drumstick" | "star" | "tag";

const PATHS: Record<IconName, string> = {
  menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  back: '<polyline points="14 5 7 12 14 19"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  check: '<polyline points="5 12 10 17 19 7"/>',
  trash: '<polyline points="4 7 20 7"/><path d="M9 7V5h6v2"/><path d="M6.5 7l1 13h9l1-13"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  clock: '<circle cx="12" cy="12" r="8"/><polyline points="12 8 12 12 15 14"/>',
  flag: '<line x1="6" y1="21" x2="6" y2="4"/><path d="M6 4h11l-2 4 2 4H6"/>',
  undo: '<polyline points="4 8 9 8 9 3"/><path d="M4 8a8 8 0 1 1-2 6"/>',
  sync: '<polyline points="20 5 20 10 15 10"/><path d="M18 10A7 7 0 1 0 19 15"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14a6 6 0 0 1 3.5 6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
  checklist: '<polyline points="3.5 7 5 8.5 7.5 6"/><line x1="11" y1="7" x2="20" y2="7"/><polyline points="3.5 15 5 16.5 7.5 14"/><line x1="11" y1="15" x2="20" y2="15"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.2 11h10l2-8H6"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><line x1="14" y1="14" x2="14" y2="20"/><line x1="17" y1="14" x2="17" y2="17"/><line x1="20" y1="14" x2="20" y2="20"/><line x1="14" y1="20" x2="20" y2="20"/>',

  leaf: '<path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z"/><path d="M6 18c3.5-3.5 6.5-6.5 10-9"/>',
  apple: '<path d="M12 8c-1.5-2-5-2.5-6.5.5C4 11 5 17 8 18.5c1.2.6 2-.3 4-.3s2.8.9 4 .3C19 17 20 11 18.5 8.5 17 5.5 13.5 6 12 8z"/><path d="M12 8c0-2 1-3.5 3-4"/>',
  grain: '<line x1="12" y1="4" x2="12" y2="20"/><path d="M12 9C9.5 9 8 7.5 8 5c2.5 0 4 1.5 4 4z"/><path d="M12 9c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 15c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4z"/><path d="M12 15c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/>',
  spice: '<path d="M5 15c6 3.5 12.5-.5 14-9-3.5-.3-5 2-7 2"/><path d="M12 6c.5-2 1.8-3 3.5-3"/>',
  milk: '<path d="M8 8l1-4h6l1 4v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><line x1="8" y1="9" x2="16" y2="9"/>',
  drop: '<path d="M12 3.5c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  bread: '<path d="M6 12a4 4 0 0 1 4-4h5a3.5 3.5 0 0 1 0 7"/><path d="M6 12v6a1 1 0 0 0 1 1h9v-4"/>',
  cup: '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9.5h2a2 2 0 0 1 0 4h-2"/><line x1="7" y1="4" x2="7" y2="6"/><line x1="11" y1="4" x2="11" y2="6"/>',
  jar: '<rect x="7" y="8" width="10" height="12" rx="2"/><path d="M8 8V6h8v2"/><line x1="9" y1="4" x2="15" y2="4"/>',
  candy: '<circle cx="12" cy="12" r="4"/><path d="M8.5 11L4 8v8z"/><path d="M15.5 13L20 16V8z"/>',
  soap: '<rect x="6" y="10" width="12" height="9" rx="3"/><path d="M9 10c0-3 6-3 6 0"/>',
  broom: '<line x1="17" y1="4" x2="9" y2="12"/><path d="M9 12l-4 7h9l2-5z"/><path d="M6.5 15.5l6 2.5"/>',
  drumstick: '<path d="M14 4a5 5 0 0 1 3.5 8.5c-1.2 1.2-3 1-4.2 1.2-.9.9-.7 2.7-1.9 3.9a3 3 0 1 1-4-4c1.2-1.2 3-.9 3.9-1.9.2-1.2 0-3 1.2-4.2A5 5 0 0 1 14 4z"/>',
  star: '<polygon points="12 4 14.2 9 19.5 9.4 15.4 12.9 16.8 18 12 15.2 7.2 18 8.6 12.9 4.5 9.4 9.8 9"/>',
  tag: '<path d="M3 12l9-9 8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
};

/** Build an inline SVG icon element. `size` in px (default 24); extra classes optional. */
export function icon(name: IconName, size = 24, cls = ""): SVGSVGElement {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true">${PATHS[name] ?? PATHS.tag}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}
