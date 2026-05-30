<div align="center">

# 🎨 figma-rest-api

**Pull colors & variable bindings from Figma — the official, sanctioned way.**

Read your design straight from `api.figma.com`, then map every color back to your
design tokens. No app patching, no remote-debugging hacks, no MCP rate limits.

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

Just a Personal Access Token and Node ≥ 18 (built-in `fetch`). One file. Zero deps.

## 🚀 Features

- 🎯 **Pull solid colors** (fills + strokes) — de-duplicated with usage counts
- 🔗 **Inspect variable bindings** — which properties (fills, padding, gap, fontSize…) are tokenized
- 🌈 **Color → token mapping** — matches Figma sRGB to your OKLCH tokens via perceptual **OKLab ΔE**
- 🔐 **Token-safe** — reads the PAT from env / `.mcp.json`, never writes or commits it
- 📄 **JSON reports** — `--out` for a machine-readable dump
- 🪶 **Zero dependencies** — a single `.mjs`, Node ≥ 18

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

> [!WARNING]
> Never commit your token. The bundled `.gitignore` already excludes `.mcp.json`
> and `.env`. The tool never writes the token into any output.

## ⚡ Usage

```bash
# by node id — run from your project root
FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxx \
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

- The **Variables REST API** (`/v1/files/:key/variables/local`) requires an
  **Enterprise** plan + `file_variables:read` scope. Without it you still get every
  rendered color and the variable ids each property is bound to — just not the
  variable *definitions*. For full token values, export them in-repo (e.g.
  `references/variables-export.json`) and match against that.

## 📜 License

[MIT](./LICENSE) © plugin87
