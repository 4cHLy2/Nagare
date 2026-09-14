<div align="center">

<img src="public/nagare.svg" width="88" alt="Nagare logo" />

# Nagare &nbsp;流れ

**_See where your money actually goes._**

[![Live demo](https://img.shields.io/badge/try%20it-live%20demo-CBA6F7?style=flat-square&logo=github&logoColor=white)](https://4chly2.github.io/Nagare/)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev)
[![d3-sankey](https://img.shields.io/badge/d3--sankey-layout-F9A03C?style=flat-square)](https://github.com/d3/d3-sankey)
![Client-side](https://img.shields.io/badge/backend-none%20·%20100%25%20local-A6E3A1?style=flat-square)
[![License: MIT](https://img.shields.io/badge/license-MIT-89B4FA?style=flat-square)](LICENSE)

<a href="https://4chly2.github.io/Nagare/"><img src="docs/screenshots/hero.png" width="860" alt="Nagare rendering a monthly budget as a Sankey diagram" /></a>

**[→ 4chly2.github.io/Nagare](https://4chly2.github.io/Nagare/)**

</div>

## what

Nagare (流れ, "flow") draws your budget as a Sankey diagram. Type in what you
earn and what you spend it on, it works out the amounts and the percentages and
draws the thing.

I built it because every spreadsheet I made told me the numbers but never
actually showed me where the money went.

A category is either one number (rent) or a bunch of items that add up
(Leisure = dining + subscriptions). Whatever you don't assign turns into an
**Unallocated** flow so the picture always balances. Overspend and it goes red
at you.

No account, no server, nothing leaves the browser. It's all in `localStorage`.
Self-host it, it's yours.

## the bits

- fill in a budget, the diagram draws itself. no wiring nodes by hand
- hover anything to light up what it touches, click to inspect
- drag nodes up and down if the auto layout annoys you. it remembers
- four palettes (Kin'yū / Sumi-e / Washi / Ukiyo-e), light or dark paper
- percentages of income, of the parent flow, or of the column
- export PNG (@2× / @4×), SVG or JSON. import it back
- undo/redo, `Ctrl+Z` / `Ctrl+Shift+Z`
- currency + locale are yours to pick, defaults are EUR / de-DE

## how it hangs together

The budget is the only thing that's real. Everything on screen is derived from
it, re-derived on every edit:

```
Budget  --deriveModel()-->  nodes + links  --d3-sankey-->  layout  -->  svg
```

Income merges into a Net Income node, that fans out into categories, categories
with items fan out again, leftovers become Unallocated. Drag positions and
colour overrides ride along inside the budget object so they survive a save.
Old saved diagrams get migrated when they're read back.

d3-sankey does the layout maths and nothing else. The SVG is drawn by hand,
which is why hover, drag, labels and curvature behave the way I wanted instead
of the way a chart library wanted.

## running it

Or don't: **[4chly2.github.io/Nagare](https://4chly2.github.io/Nagare/)** is
the same build, deployed from `main` on every push. Still no backend — your
budget stays in that browser's `localStorage` and I never see it.

Yarn via [Corepack](https://github.com/nodejs/corepack), version's pinned in
`package.json`.

```bash
corepack enable
corepack yarn install
corepack yarn dev        # http://localhost:5174
```

```bash
corepack yarn build      # tsc --noEmit && vite build -> dist/
corepack yarn preview
```

## docker

nginx serving static files on :80. It does not care what's in front of it and
securing it (TLS, auth, firewall) is your problem. Traefik, NPM, Caddy, a
Cloudflare tunnel, or nothing.

```bash
docker compose up -d --build   # http://localhost
```

Publishes `80:80`, edit `docker-compose.yml` for a different host port. Or just:

```bash
docker build -t nagare .
docker run --rm -p 80:80 nagare
```

Health endpoint is `/healthz`, the container's HEALTHCHECK uses it.

## contributing

Issues and PRs are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) has the setup,
the branch model (PRs go to `dev`, not `main`), what CI checks, and which ideas
aren't going to land. Be decent to each other:
[Code of Conduct](CODE_OF_CONDUCT.md).

Bug report or feature idea: [open an issue](https://github.com/4cHLy2/Nagare/issues/new/choose).

## security

Found something exploitable? **Don't open a public issue** — use
[private reporting](https://github.com/4cHLy2/Nagare/security/advisories/new).
[SECURITY.md](SECURITY.md) has the scope, the threat model of a no-backend app,
and notes on hardening a self-hosted deployment.

## license

[MIT](LICENSE). Do what you like with it, keep the copyright notice.

Everything that ships inside the bundle is MIT, ISC or BSD-3-Clause, with the
notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) — ten packages, no
copyleft, no attribution strings you have to display in the UI. The webfonts
come from Google Fonts under the SIL Open Font License and aren't bundled. The
logo, the screenshots and the code in `src/` are mine, under the MIT license
above — the colour palette isn't: it's [Catppuccin](https://github.com/catppuccin/catppuccin)
Mocha (MIT), credited in the notices file.
