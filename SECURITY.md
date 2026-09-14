# Security policy

Nagare is a static client-side app. No backend, no accounts, no server-side
state: your budget lives in the browser's `localStorage`, and the container is
nginx handing out the built files. That shapes what counts as a vulnerability
here — most of the interesting surface is "can budget data turn into code".

## reporting a vulnerability

Privately, please, **not** in a public issue:

**→ [Report a vulnerability](https://github.com/4cHLy2/Nagare/security/advisories/new)**

(Or: repo → *Security* → *Advisories* → *Report a vulnerability*. It's GitHub's
private reporting form; only the maintainer sees it.)

Useful to include:

- commit SHA, release, or image tag
- how it's running — `yarn dev`, `yarn preview`, the Docker image, the Pages
  demo, something else
- steps to reproduce, and what an attacker actually gets
- a proof-of-concept budget JSON or URL if the bug needs one

What to expect: one person, evenings and weekends, so no SLA. Realistically an
acknowledgement within a few days, and a fix on `dev` → `main` → the `latest`
image once we agree what it is. Advisory gets published with credit to you
unless you'd rather stay anonymous. If you hear nothing in two weeks, ping the
advisory thread.

Please don't point automated scanners at <https://4chly2.github.io/Nagare/> —
it's static hosting I don't control, and you'll be reporting GitHub's headers
back to me. Clone it and test your own copy.

## supported versions

Pre-1.0 and fast-moving, so support means "the tip":

| Version | Supported |
| --- | --- |
| `main`, and `ghcr.io/4chly2/nagare:latest` built from it | ✅ |
| `dev` | ✅ best effort, it's the working branch |
| any older tag, commit SHA or image digest | ❌ rebuild from `main` |

No backports. Fixes land on `dev`, get merged to `main`, and the image is
rebuilt — pull it again.

## in scope

- script execution reached through budget data: category and item names, the
  project name, imported JSON, or the old diagram format going through
  `migrateModelToBudget()`
- anything that makes an exported SVG or PNG carry executable content — the SVG
  export serializes the live DOM, and a downloaded `.svg` opened in a browser is
  a script context
- reading or corrupting another project's saved data (`nagare.projects`,
  `nagare.current`) from somewhere it shouldn't be reachable
- a path that makes the app talk to the network at all beyond the webfonts
  below — exfiltrating a budget would need that
- the default `Dockerfile` / `nginx.conf` serving something exploitable, e.g.
  path traversal out of `/usr/share/nginx/html`
- CI: anything giving untrusted code the `GITHUB_TOKEN`, the `packages: write`
  job, or the Pages deploy
- a dependency CVE you can actually reach in the shipped bundle — say which call
  path

## out of scope

- **No TLS / no auth on your own deployment.** The image serves plain HTTP on
  :80 by design; TLS, auth and firewalling are the operator's job and the README
  says so. Put a proxy in front.
- **`localStorage` is readable by anyone with the browser profile.** It isn't
  encrypted and nothing claims it is. Don't put a budget you consider a secret
  on a shared machine.
- **Self-XSS.** Pasting a payload into your own JSON editor and watching it fire
  in your own tab isn't a finding unless you can hand it to somebody else.
- **Resource exhaustion from your own input** — a 50,000-category budget
  freezing your own tab.
- **Scanner output with no reachable path**: `npm audit` lines, "no SRI", "no
  rate limiting", missing headers on a deployment that never set them. Hardening
  suggestions are welcome as normal issues, just not as vulnerabilities.
- Anything needing physical access to an unlocked machine, or a browser
  extension the user already installed.

## what it actually touches

Worth knowing before you go looking:

- **Network at runtime:** webfonts only — `fonts.googleapis.com` and
  `fonts.gstatic.com`, from `<head>` in [`index.html`](index.html). Your budget
  never leaves the browser, but those two requests do tell Google your IP and
  that you loaded the page. Self-host the fonts if that bothers you; nothing else
  breaks.
- **No** cookies, analytics, telemetry, service worker, or third-party scripts.
- **Storage:** `nagare.projects` (saved list) and `nagare.current` (last open)
  in `localStorage`. Nothing else, no IndexedDB.
- **Imports** are parsed with `JSON.parse` and checked by `validateBudget()`
  before they're accepted; old formats go through a migration. No `eval`, no
  `new Function`, no `innerHTML`/`dangerouslySetInnerHTML` anywhere in `src/`
  (`grep` it) — all text goes through React, which escapes it.
- **Export** builds files client-side with `Blob` + `URL.createObjectURL`; no
  upload, no render service.

## hardening a deployment

- Reverse proxy with TLS in front of it. Don't expose :80 to the internet raw.
- The shipped [`nginx.conf`](nginx.conf) sets no security response headers —
  deliberately, since whatever proxy you put in front usually wants to own
  them, and two conflicting CSPs are worse than none. Set them there. What
  works with this app as it ships:

  ```nginx
  add_header X-Content-Type-Options "nosniff"     always;
  add_header X-Frame-Options        "SAMEORIGIN"  always;
  add_header Referrer-Policy        "no-referrer" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'" always;
  ```

  `style-src 'unsafe-inline'` is needed because React writes inline `style`
  attributes; the `googleapis`/`gstatic` hosts are the webfonts (drop both if
  you self-host them); `img-src blob:` is the PNG export rasterising an SVG
  blob through an `<img>`. Nothing in the app makes an XHR or `fetch` call, so
  `connect-src 'self'` costs you nothing. If you add these inside `nginx.conf`
  itself, mind that nginx's `add_header` doesn't merge: a `location` block with
  its own `add_header` drops every header inherited from the `server` block.
- Rebuild the image periodically so the nginx and Node base layers stay current;
  Dependabot only bumps what's in the repo, it can't patch a container you built
  in March.
- Pin the image by digest if you care about what you're actually running.

## keeping dependencies honest

[Dependabot](.github/dependabot.yml) runs weekly for npm and monthly for Docker
and Actions, all targeting `dev`. Every PR has to pass `yarn lint` and
`tsc --noEmit && vite build` before an image is built.

If you spot a dependency that's unmaintained or has a reachable advisory,
an issue is fine — that one doesn't need the private channel.
