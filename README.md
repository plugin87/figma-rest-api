# figma-rest-api

Pull design data from Figma using the **official REST API** — colors and variable
bindings — and map every Figma color back to your project's design tokens.

No app patching, no CDP/remote-debugging, no rate-limited MCP tool calls. Just the
sanctioned `api.figma.com` endpoints + a Personal Access Token.

## Install

```bash
# clone, or add as a dependency
npm i -g figma-rest-api          # exposes `figma-pull`
# or run straight from a clone:
node figma-pull.mjs --help
```

Requires Node ≥ 18 (uses the built-in `fetch`).

## Auth

Provide a [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens).
The token is read from (first found wins):

1. `$FIGMA_PERSONAL_ACCESS_TOKEN`
2. `mcpServers.figma.env.FIGMA_PERSONAL_ACCESS_TOKEN` in `./.mcp.json`

> The token is **never** written into output or committed — keep `.mcp.json` /
> `.env` out of git (see the bundled `.gitignore`).

## Usage

```bash
# by node id (run from your project root)
FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxx \
  figma-pull --file <FILE_KEY> 72-2591 308-14

# write a JSON report
figma-pull --file <FILE_KEY> 72-2591 --out figma-report.json

# file key can also come from the environment
FIGMA_FILE_KEY=<KEY> figma-pull 72-2591
```

`<FILE_KEY>` and node ids come from a Figma URL:
`figma.com/design/<FILE_KEY>/...?node-id=72-2591`.

## What it pulls

- **Solid colors** (fills + strokes), de-duplicated with usage counts, as hex + rgb(a).
- **Variable bindings** — which node properties (fills, strokes, padding, gap,
  fontSize, …) are bound to variables, with their variable IDs.
- The `/variables/local` endpoint is tried for id→name resolution but is
  **Enterprise-only**; on other plans it degrades gracefully to raw IDs.

## Color → token mapping

When run inside a project that has them, colors are matched to your tokens by
converting both sRGB and OKLCH into **OKLab** and measuring perceptual distance
(ΔE):

- **primitives** from `.claude/skills/*/references/DESIGN.md` (§B table) → e.g. `blue/700`
- **semantic** tokens from `app/globals.css` (`:root` / `.dark`) → e.g. `--primary`

```
#1d4ed8     7×  = blue/700
#e5e5e5    17×  = neutral/200  · --border
#ffffff     2×  = white  · --background
#4f9cf9     1×  ≈ blue/400 (Δ0.018)
```

`=` exact match · `≈` nearest (with ΔE) · `·` matching semantic token.

If those files aren't present, mapping is skipped and raw hex/rgb is still shown.

## License

MIT © plugin87
