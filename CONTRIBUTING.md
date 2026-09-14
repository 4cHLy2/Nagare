# Contributing to Nagare

Thanks for looking. Nagare is a small, opinionated project maintained by one
person, so the short version is: open an issue before writing anything big, and
keep PRs focused.

By contributing you agree your work is licensed under the [MIT License](LICENSE),
same as the rest of the project. Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security bug? Don't open an
issue — see [SECURITY.md](SECURITY.md).

## before you start

- **Bug?** Open an issue. Include what you did, what happened, what you
  expected, browser + version, and the budget JSON if the bug needs one
  (`Export → JSON`, strip anything private first).
- **Feature?** Open an issue and describe the problem before the solution. This
  is a budget Sankey tool with no backend and no accounts, and it's going to
  stay that way — proposals that need a server, a login or a database aren't
  going to land.
- **Tiny fix?** Typos, broken links, an obvious one-line bug: just send the PR.

## setting up

Yarn via [Corepack](https://github.com/nodejs/corepack), version's pinned in
`package.json`. CI runs Node 26.

```bash
corepack enable
corepack yarn install
corepack yarn dev        # http://localhost:5174
```

Before you push, run what CI runs:

```bash
corepack yarn lint       # eslint
corepack yarn build      # tsc --noEmit && vite build
```

Both have to pass — [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
runs exactly those two on every PR and won't build an image until they do.
There's no test suite yet; if you're adding one, open an issue first so we agree
on the runner.

## branches

`dev` is where work lands, `main` is what ships (it's what the container image
and the Pages deploy are built from). Dependabot targets `dev` too.

```
git switch dev && git pull
git switch -c fix/whatever-it-is
```

Open the PR against **`dev`**, not `main`. `main` only ever gets `dev` merged
into it.

## how it's put together

Read the *how it hangs together* section of the [README](README.md#how-it-hangs-together)
first. The important part:

> the budget is the only thing that's real — everything on screen is derived
> from it, re-derived on every edit.

So: no state that duplicates what `deriveModel()` can compute, and nothing in
`localStorage` that isn't part of the budget document or settings.

| where | what's in it |
| --- | --- |
| `src/lib/budget.ts` | budget maths, validation, migrations, `deriveModel()` |
| `src/lib/sankey.ts` | d3-sankey layout, nothing else |
| `src/lib/export.ts` | PNG / SVG / JSON export, no libraries |
| `src/store.ts` | zustand store, undo/redo, `localStorage` persistence |
| `src/components/` | the UI. `SankeyCanvas.tsx` draws the SVG by hand |
| `src/theme.ts` | the four palettes and light/dark paper |

If you change the shape of a saved budget, add a migration so old saves still
open. People have real budgets in there.

## code style

- eslint + TypeScript settle most of it; run `yarn lint` and match what's there.
- Comments explain *why*, lowercase and to the point, like the ones already in
  the source. Don't narrate what the code obviously does.
- No new dependencies without a reason in the PR. The SVG is drawn by hand on
  purpose — "there's a chart library for this" isn't an argument here. A new
  *runtime* dependency also means regenerating
  [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) (the command's at the bottom
  of that file) and it has to be MIT / ISC / BSD / Apache-2.0 — nothing
  copyleft, the bundle gets redistributed.
- Keep palette / locale / currency choices data, not hardcoded values.

## commits and PRs

- Short imperative subject line, no `feat:` / `fix:` prefixes needed:
  `Add PNG export at 4x`, not `feat(export): added 4x`.
- One concern per PR. Refactor *and* feature in the same diff means it gets
  picked apart before it gets merged.
- Say what you changed and how you checked it. Screenshots for anything visual —
  both light and dark paper, since half the bugs only show in one.
- Rebase on `dev` if it's moved; don't merge `dev` back into your branch.
