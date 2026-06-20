// WCAG contrast auto-fix — the WRITE counterpart to the REST reader.
//
// The REST API (figma-pull.mjs) can only READ: Figma exposes no REST endpoint to
// change a node's fill. Design writes go through the Plugin API, which runs inside
// Figma — so this plugin finds text that FAILS WCAG 2.2 AA contrast against its
// real background and recolors it to pass, in YOUR Figma session (no MCP quota, no
// Enterprise plan).
//
// Color-agnostic: it computes true relative-luminance contrast ratios (W3C formula)
// rather than matching hardcoded hexes. For each TEXT node it resolves the nearest
// solid background behind it, checks the ratio against the AA threshold (4.5:1
// normal, 3:1 large text), and if it fails, blends the text color toward black or
// white — whichever the background calls for — by the SMALLEST amount that passes,
// so hue is preserved as much as possible.
//
// Runs on the CURRENT page — open the page you want to fix, then run the plugin.

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

// --- WCAG relative luminance + contrast -------------------------------------
function channelLum(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(rgb) {
  return 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// --- fill helpers ------------------------------------------------------------
function solid(n) {
  const fs = n.fills;
  if (!Array.isArray(fs)) return null; // figma.mixed, image, gradient -> skip
  const f = fs.find((f) => f.type === "SOLID" && f.visible !== false);
  return f ? f.color : null;
}
function setColor(n, color) {
  n.fills = n.fills.map((f) => (f.type === "SOLID" && f.visible !== false ? Object.assign({}, f, { color }) : f));
}

// Nearest visible solid fill walking up the tree; falls back to the page background.
function resolveBackground(n) {
  let p = n.parent;
  while (p && p.type !== "PAGE") {
    const c = solid(p);
    if (c) return c;
    p = p.parent;
  }
  const bg = figma.currentPage.backgrounds;
  if (Array.isArray(bg)) {
    const f = bg.find((f) => f.type === "SOLID" && f.visible !== false);
    if (f) return f.color;
  }
  return { r: 1, g: 1, b: 1 }; // default canvas ~ white
}

// --- contrast repair ---------------------------------------------------------
function blend(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
// Smallest nudge of `fg` toward black or white that meets `threshold` against `bg`.
// Returns the new color, or the best achievable color if even the extreme can't pass.
function repair(fg, bg, threshold) {
  const black = { r: 0, g: 0, b: 0 }, white = { r: 1, g: 1, b: 1 };
  const pole = contrast(white, bg) >= contrast(black, bg) ? white : black;
  if (contrast(pole, bg) < threshold) return { color: pole, exact: false }; // best effort
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(blend(fg, pole, mid), bg) >= threshold) hi = mid; else lo = mid;
  }
  return { color: blend(fg, pole, hi), exact: true };
}

// --- large-text test (WCAG: >=24px, or >=18.66px bold) -----------------------
function isLarge(t) {
  const size = typeof t.fontSize === "number" ? t.fontSize : 0; // mixed -> treat as normal (stricter)
  const weight = typeof t.fontWeight === "number" ? t.fontWeight : 400;
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

(async () => {
  const page = figma.currentPage;
  figma.skipInvisibleInstanceChildren = true;

  let fixed = 0, bestEffort = 0, skipped = 0, ok = 0;

  for (const t of page.findAll((n) => n.type === "TEXT")) {
    const fg = solid(t);
    if (!fg) { skipped++; continue; } // no single solid text color (mixed / gradient)

    const bg = resolveBackground(t);
    const threshold = isLarge(t) ? AA_LARGE : AA_NORMAL;

    if (contrast(fg, bg) >= threshold) { ok++; continue; }

    const r = repair(fg, bg, threshold);
    setColor(t, r.color);
    fixed++;
    if (!r.exact) bestEffort++;
  }

  const note = bestEffort ? ` (${bestEffort} best-effort — bg too mid-tone for AA)` : "";
  figma.closePlugin(`WCAG AA on "${page.name}" — ${fixed} fixed${note}, ${ok} already passed, ${skipped} skipped`);
})();
