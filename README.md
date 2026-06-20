<div align="center">

# 🎨 figma-rest-api

**Read colors & variable bindings from Figma — and write WCAG fixes back, the sanctioned way.**

Pull your design straight from `api.figma.com` and map every color to your design
tokens. Then apply contrast fixes through the bundled **Figma plugin** — because
the REST API is read-only, design writes go through the Plugin API. No app
patching, no remote-debugging hacks, no MCP rate limits.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-43853d.svg)](https://nodejs.org)
[![API](https://img.shields.io/badge/Figma-REST%20API-f24e1e.svg)](https://www.figma.com/developers/api)

</div>

---

## ✨ Why

| | This tool | Desktop-patching tools |
|---|:---:|:---:|
| Uses official `api.figma.com` | ✅ | ❌ |
| Modifies the Figma app binary | ❌ | ⚠️ patches `app.asar` |
| Strips Gatekeeper / re-signs | ❌ | ⚠️ yes |
| Within Figma ToS | ✅ | ❌ |
| Dependencies | **none** | nvm, daemons, CDP |

Just a Personal Access Token and Node ≥ 18 (built-in `fetch`) to read. To write,
a tiny first-party-style Figma plugin you run inside Figma. Zero deps either way.

## 🚀 Features

**Read (REST, `figma-pull.mjs`)**
- 🎯 **Pull solid colors** (fills + strokes) — de-duplicated with usage counts
- 🔗 **Inspect variable bindings** — which properties (fills, padding, gap, fontSize…) are tokenized
- 🌈 **Color → token mapping** — matches Figma sRGB to your OKLCH tokens via perceptual **OKLab ΔE**
- 🔐 **Token-safe** — reads the PAT from env / `.mcp.json`, never writes or commits it
- 📄 **JSON reports** — `--out` for a machine-readable dump

**Write (Plugin, `figma-plugin/`)**
- ✍️ **Recolor low-contrast badges** to WCAG-2.2-passing values, in your own Figma session
- 🪶 **No quota, no Enterprise** — runs through the Plugin API, not REST

## 📦 Install

```bash
npm i -g figma-rest-api          # exposes the `figma-pull` command
```

…or run straight from a clone:

```bash
node figma-pull.mjs --help
```

## 🔑 Auth

Grab a [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens).
It's resolved from the **first** source found:

| Priority | Source |
|:---:|---|
| 1 | `$FIGMA_PERSONAL_ACCESS_TOKEN` |
| 2 | `mcpServers.figma.env.FIGMA_PERSONAL_ACCESS_TOKEN` in `./.mcp.json` |

Pick one (the example token below is a placeholder — use your own):

```bash
# Option 1 — environment variable
export FIGMA_PERSONAL_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
```

```jsonc
// Option 2 — .mcp.json in your project root
{
  "mcpServers": {
    "figma": {
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

## ⚡ Usage (read)

```bash
# by node id — run from your project root
FIGMA_PERSONAL_ACCESS_TOKEN=figd_YOUR_TOKEN_HERE \
  figma-pull --file <FILE_KEY> 72-2591 308-14

# write a JSON report
figma-pull --file <FILE_KEY> 72-2591 --out figma-report.json

# file key from the environment instead of a flag
FIGMA_FILE_KEY=<KEY> figma-pull 72-2591
```

Both `<FILE_KEY>` and node ids live in any Figma URL:

```
figma.com/design/ <FILE_KEY> /My-File?node-id= 72-2591
                  └─────────┘                  └──────┘
```

### Options

| Flag | Description |
|---|---|
| `<nodeId>…` | One or more node ids (`72-2591`, comma- or space-separated) |
| `--file <KEY>` | Figma file key *(or `$FIGMA_FILE_KEY`)* — **required** |
| `--out <path>` | Write a JSON report (relative to cwd, or absolute) |
| `-h`, `--help` | Show usage |

## ✍️ Write back ([`figma-plugin/`](./figma-plugin))

**The REST API cannot modify a design.** Figma exposes no endpoint to set a node's
fill — `figma-pull.mjs` is GET-only by design. Design writes go through the
**Plugin API**, which runs *inside* Figma. The bundled plugin uses it to recolor
low-contrast badges to WCAG-2.2-passing values, in your own session — **no MCP
quota and no Enterprise plan required.**

| Element | From | To | Contrast |
|---|---|---|---|
| badge text | `#171717` / `#1e3a8a` on `#2563eb` | **white** | 5.17:1 ✅ |
| badge bg | `#f87171` (white text) | **`#d3111a`** | 5.43:1 ✅ |

**Run it** (Figma **desktop** app):

1. **Plugins → Development → Import plugin from manifest…** → pick
   [`figma-plugin/manifest.json`](./figma-plugin/manifest.json).
2. Open the file and navigate to the page you want to fix.
3. **Plugins → Development → WCAG Contrast Fix.** It recolors and closes with a
   summary like `WCAG fix on "Badge" — 2 text -> white, 1 bg -> #d3111a`.

Then re-check with the reader: `figma-pull --file <KEY> <badge-node-id>`.

## 🌈 Color → token mapping

When run inside a project that ships design tokens, each color is matched to the
nearest token by converting **both** sRGB and OKLCH into **OKLab** and measuring
perceptual distance (ΔE):

```text
━━ CANVAS  "Accordion"  (72-2591) ━━
  19 solid colors · 904 variable bindings
  Color → token:
    #0a0a0a    56×  = neutral/950  · --foreground
    #e5e5e5    17×  = neutral/200  · --border
    #1d4ed8     7×  = blue/700
    #ffffff     2×  = white  · --background
    #4f9cf9     1×  ≈ blue/400 (Δ0.018)
```

| Symbol | Meaning |
|:---:|---|
| `=` | exact match |
| `≈` | nearest match, shown with its `ΔE` |
| `·` | the matching **semantic** token |

**Sources** (auto-detected in the cwd, skipped if absent):

- **primitives** → `.claude/skills/*/references/DESIGN.md` (§B table) → `blue/700`, `neutral/200`…
- **semantic** → `app/globals.css` (`:root` / `.dark`) → `--primary`, `--border`…

## 📥 What it pulls

- **Solid colors** from `fills` + `strokes`, as `#hex` and `rgb(a)`, with counts.
- **Variable bindings** — node property → variable id, across colors, spacing & type.
- Variable **id → name** is attempted via `/variables/local`, but that endpoint is
  **Enterprise-only**; on other plans it degrades gracefully to raw ids.

## ⚠️ Limitations

- **REST is read-only for design.** There is no REST endpoint to change a node's
  fill, text, or layout — use the bundled [plugin](./figma-plugin) for writes.
- The **Variables REST API** (`/v1/files/:key/variables/local`) requires an
  **Enterprise** plan + `file_variables:read` scope (and `:write` to mutate). Without
  it you still get every rendered color and the variable ids each property is bound
  to — just not the variable *definitions*. For full token values, export them
  in-repo (e.g. `references/variables-export.json`) and match against that.

## 📜 License

[MIT](./LICENSE) © plugin87
