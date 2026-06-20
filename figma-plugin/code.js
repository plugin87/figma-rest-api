// WCAG contrast auto-fix — the WRITE counterpart to the REST reader.
//
// The REST API (figma-pull.mjs) can only READ: Figma exposes no REST endpoint to
// change a node's fill. Design writes go through the Plugin API, which runs inside
// Figma — so this plugin recolors low-contrast badge text/backgrounds to
// WCAG-2.2-passing values, in YOUR Figma session (no MCP quota, no Enterprise plan).
//
// Runs on the CURRENT page — open the page you want to fix, then run the plugin.
//   - badge text  #171717 / #1e3a8a on #2563eb  -> white     (5.17:1)
//   - badge bg     #f87171 (white text)          -> #d3111a  (5.43:1)

const WHITE = { r: 1, g: 1, b: 1 };
const RED = { r: 0xd3 / 255, g: 0x11 / 255, b: 0x1a / 255 }; // #d3111a

function toRGB(h) {
  return { r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 };
}
function eq(c, h) {
  if (!c) return false;
  const t = toRGB(h);
  return Math.abs(c.r - t.r) < 0.012 && Math.abs(c.g - t.g) < 0.012 && Math.abs(c.b - t.b) < 0.012;
}
function solid(n) {
  const fs = n.fills;
  if (!Array.isArray(fs)) return null;
  const f = fs.find((f) => f.type === "SOLID" && f.visible !== false);
  return f ? f.color : null;
}
function setColor(n, color) {
  n.fills = n.fills.map((f) => (f.type === "SOLID" && f.visible !== false ? Object.assign({}, f, { color }) : f));
}
function ancestorBlue(n) {
  let p = n.parent;
  while (p && p.type !== "PAGE") { if (eq(solid(p), "#2563eb")) return true; p = p.parent; }
  return false;
}

(async () => {
  const page = figma.currentPage; // already loaded — it is the open page
  figma.skipInvisibleInstanceChildren = true;

  let textFixed = 0, bgFixed = 0;

  // 1) dark badge-label text on a blue badge -> white
  for (const t of page.findAll((n) => n.type === "TEXT")) {
    const c = solid(t);
    if ((eq(c, "#171717") || eq(c, "#1e3a8a")) && ancestorBlue(t)) { setColor(t, WHITE); textFixed++; }
  }
  // 2) destructive badge background #f87171 -> #d3111a
  const containerTypes = ["RECTANGLE", "FRAME", "INSTANCE", "COMPONENT", "COMPONENT_SET"];
  for (const n of page.findAll((n) => containerTypes.indexOf(n.type) !== -1)) {
    if (eq(solid(n), "#f87171")) { setColor(n, RED); bgFixed++; }
  }

  figma.closePlugin(`WCAG fix on "${page.name}" — ${textFixed} text -> white, ${bgFixed} bg -> #d3111a`);
})();
