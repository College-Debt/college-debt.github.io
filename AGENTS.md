# AGENTS.md — Architecture & Operations Guide for College Debt SMP (`collegedebt.app`)

Architectural context, authentication/worker topology, authoring rules, and accessibility standards for AI agents and human contributors working on the College Debt SMP site.

For visual tokens, typography, breakpoints, and exact UI component specifications (including the standard `40px` button spec), see [`DESIGN.md`](file:///Users/cherryquartzio/Repos/college-debt.github.io/DESIGN.md).

---

## 1. Platform Overview & Repository Strategy

- **Purpose**: Unified site (`collegedebt.app`) for **College Debt SMP** (`@Zeroaf`, `@CherryQuartzio`), combining the public landing page & announcements, the live knowledge wiki (`/wiki/`), member-gated tools (`/paintings/`), and companion status monitoring (`status.collegedebt.app`).
- **Branching**:
  - `main`: Active production source. Pushing to `main` builds Hugo + Pagefind and deploys to GitHub Pages via [`.github/workflows/deploy.yml`](file:///Users/cherryquartzio/Repos/college-debt.github.io/.github/workflows/deploy.yml).
  - `gh-pages`: Legacy Jekyll archive — **preserve untouched; do not overwrite or delete**.
- **Stack**:
  - **Static Generator**: Hugo Extended (`v0.145.0` pinned in CI), Goldmark (`unsafe = true`, block/title attributes enabled in [`hugo.toml`](file:///Users/cherryquartzio/Repos/college-debt.github.io/hugo.toml)).
  - **Search**: Static client-side search indexed at build time by `pagefind` (`npx -y pagefind --site public`).
  - **Auth & Dynamic APIs**: Cloudflare Zero Trust Access (`collegedebt.cloudflareaccess.com`) + TypeScript Cloudflare Worker (`cdsmp-paintings-api`) in [`workers/paintings-api/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/workers/paintings-api/).
  - **Hosting**: GitHub Pages (`static/CNAME` -> `collegedebt.app`) proxied behind Cloudflare.

---

## 2. Repository Structure

```text
college-debt.github.io/
├── .github/workflows/deploy.yml     # Hugo Extended v0.145.0 build + Pagefind + Pages deploy
├── content/
│   ├── about.md                     # /about/
│   ├── paintings.md                 # /paintings/ (type: paintings)
│   ├── posts/                       # Announcements & changelogs
│   └── wiki/                        # Live knowledge wiki (/wiki/, 29 content pages + indexes)
├── layouts/
│   ├── _default/                    # baseof.html, single.html, list.html, term.html
│   ├── paintings/single.html        # Custom Paintings Studio & Server Gallery workspace
│   ├── partials/                    # header, footer, account_modal, search_modal, personalize_modal, lightbox_modal, post_list
│   ├── partials/wiki/               # breadcrumbs, cover, icon, pager, sidebar, toc
│   ├── posts/single.html            # Post layout with prev/next pager
│   ├── shortcodes/                  # hint, tabs, tab, stepper, step, content-ref, embed
│   ├── wiki/                        # list.html & single.html
│   ├── index.html & 404.html
├── static/
│   ├── CNAME                        # collegedebt.app
│   ├── assets/{fonts,images,wiki}/  # Minecraft, Inter, Cardo, Noto Serif fonts + imagery
│   ├── css/                         # wp-theme.css, custom.css, wiki.css, paintings.css, theme-dark.css, theme-personalize.css, all.min.css
│   ├── js/                          # nav.js, personalize.js, account.js, search.js, lightbox.js, wiki.js, paintings.js
│   └── webfonts/                    # Bundled Font Awesome 6 Free webfonts
├── workers/paintings-api/           # Cloudflare Worker (auth/session/GitHub PR publishing & gallery CRUD)
├── hugo.toml
├── AGENTS.md
└── DESIGN.md
```

---

## 3. Authentication, Cloudflare Access & Worker Split

### A. Site-Wide Login & Session Retention
- **Identity Provider**: Microsoft Entra ID via Cloudflare Zero Trust Access (`Custom Paintings Studio`, app ID `40ac40e2-bc51-480d-9836-d23de1a4229a`, policy `All College Debt`, `72h` session duration).
- **Header Account Popover** ([`layouts/partials/account_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/account_modal.html), [`static/js/account.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/account.js)):
  - Trigger button sits right of Search (`Key` icon signed out, `Profile` icon signed in; anti-flicker via `sessionStorage['collegedebt_auth_hint']`).
  - Edge identity check calls `GET /cdn-cgi/access/get-identity` on every page load for display name & email; opening the popover when signed in queries `GET /api/session` to resolve `isAdmin` status (`Admin` badge is hidden for regular members).
  - Signed-out state opens `/api/login?next=<encoded-return-path>`, protected by Cloudflare Access (`redirect: 'manual'` / `302` bounce back to the originating page). Signed-in state links to `/paintings/`, `https://myaccount.microsoft.com/`, and `/cdn-cgi/access/logout`.

### B. Worker Architecture (`workers/paintings-api`)
- Routes on `collegedebt.app`: `/api/login*`, `/api/session*`, `/api/paintings*` (backward-compatible aliases `/api/paintings/login` and `/api/paintings/session` are also routed in [`src/index.ts`](file:///Users/cherryquartzio/Repos/college-debt.github.io/workers/paintings-api/src/index.ts)).
- **Important Identity Nuance**: Cloudflare Access app JWTs (`Cf-Access-Jwt-Assertion`) omit `payload.name` and `payload.common_name`; [`src/auth.ts`](file:///Users/cherryquartzio/Repos/college-debt.github.io/workers/paintings-api/src/auth.ts) intentionally leaves `viewer.name` as `""` when absent so frontend scripts never overwrite the full Entra display name fetched from `/cdn-cgi/access/get-identity` with a lowercased email prefix.
- **Compute Split**: The Worker handles Access JWT verification, validation (`src/png.ts`), direct GitHub repository reads/writes (`College-Debt/resource-pack`), and gallery metadata/recipe updates; full resource-pack/data-pack zip packaging stays in `College-Debt/resource-pack` GitHub Actions.
- **Deploy Safety**: Preserve dashboard secrets (`ADMIN_EMAILS`, `GITHUB_TOKEN`) via `keep_bindings: ["secret_text"]` whenever uploading Worker bundles cleanly via Cloudflare API. Local dev tests run via `npm run typecheck && npm test` inside `workers/paintings-api/`.

---

## 4. Wiki Architecture & Navigation Stability

- **Intra-Wiki PJAX** ([`static/js/wiki.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/wiki.js)): Intercepts `/wiki/*` clicks and swaps `.wiki-content-wrapper` + `.wiki-toc-rail` via background `fetch` + `DOMParser` without rebuilding the sidebar DOM.
- **Synchronous Scroll & Expansion Restoration**: An inline script immediately after `<aside class="wiki-sidebar-card">` in [`layouts/partials/wiki/sidebar.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/wiki/sidebar.html) restores `scrollTop` and `wiki_open_sections` from `sessionStorage` before first paint.
- **Active Row Stability**: `.wiki-nav-row.is-active` and `.wiki-nav-item.is-active` set `transition: none !important` so direct loads and PJAX transitions never flash colors.

---

## 5. Status Monitoring & Infrastructure (`status.collegedebt.app`)

- **Host & Ingress**: Self-hosted **Uptime Kuma** on Proxmox homelab LXC 101 (`10.67.1.12:3001`), exposed via `cloudflared` tunnel on LXC 109 (`status_page_cname` mapped to status page ID `1`).
- **Minecraft Multiplexing**: `smp.collegedebt.app` (`College Debt SMP (Vanilla)`) and `cobble.collegedebt.app` (`Cobble Debt (Cobbleverse)`) run on OCI ARM (`165.1.77.175` / Tailscale `100.70.90.117`) behind `minecraft-router` on TCP `25565`.
- **Probes & Telemetry**:
  - Core probes cover GameDig Minecraft `25565`, `oracle-ampere` TCP `22`, `minecraft-router` TCP `25565`, and `switch-lan-play` TCP `11451` (`10.0.0.99`).
  - Companion service `gamedig-sync` (`/opt/uptime-kuma/gamedig-sync/sync.js`, running in `louislam/uptime-kuma:2` every 60s via SQLite WAL mode) writes live player counts and version tags (`Players`, `Version`) into `kuma.db`.
- **Daily Reboot Window**: `cdsmp` restarts daily at `11:00 UTC` via `cdsmp-restart` (10m countdown, reboot at `11:10 UTC`). Uptime Kuma Maintenance ID `1` (`cron: 0 11 * * *`, `900s`, UTC, hidden from status banners) flags downtime penalties away (`MAINTENANCE`), and `gamedig-sync` tags `Players: Maintenance` during that window.

---

## 6. Accessibility & Content Authoring Standards

### A. Landmarks, Keyboard Focus & Shared Dialog Helper
- **Single Landmarks**: Every layout wraps primary content in `<main id="main-content" tabindex="-1">`, preceded by `.skip-link` in `baseof.html`, and renders one `<footer>` in `footer.html`.
- **Shared Helper (`window.__cdA11y`)**: Defined in [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js) and consumed by `search.js`, `personalize.js`, `account.js`, `lightbox.js`, and `wiki.js` for `trapTab()`, `setBackgroundInert()`, and focus restoration on close.
- **Dialogs & Live Regions**:
  - `#site-mobile-nav-modal`, `#site-search-modal`, `#site-personalize-modal`, `#site-account-modal`, and `#site-lightbox` all declare `role="dialog"` and `aria-modal="true"`.
  - `#site-search-live-status`, `#site-lightbox-status`, `#wiki-route-announcer`, `#pt-sr-status`, and `#pt-session-callout` announce async results, image changes, and state updates with `aria-live="polite"`.
- **Drawer Inertness**: Off-screen wiki drawers (`.wiki-sidebar-card <= 820px`, `.wiki-toc-rail <= 1100px`) toggle `inert`, `aria-hidden="true"`, and delayed `visibility: hidden`.
- **Focus Discipline**: Non-keyboard focus rings stay hidden via `:focus:not(:focus-visible)`; interactive controls reveal `2px solid var(--brand-accent)` `:focus-visible` outlines, while text inputs highlight solely on border color.
- **Shortcodes & Semantic Helpers**: Active sidebar links and current breadcrumbs expose `aria-current="page"`; `hint.html` includes `<span class="sr-only">` severity labels; `wiki.js` upgrades `.wiki-tabs` to full WAI-ARIA `tablist`/`tab`/`tabpanel` keyboard navigation.

### B. Markdown Authoring Rules (`content/`)
1. **Headings**: Page templates own `<h1>`; Markdown body headings must start at `##` (`h2`) without skipping levels or leaving empty headings.
2. **Images & Figures**: Informative `<img>` elements require descriptive `alt` text (decorative images keep `alt=""`); omit empty `<figcaption></figcaption>`.
3. **Tables & Links**: HTML tables require non-empty `<thead><th>` headers (`scope="col"`/`row`). Links must use descriptive labels rather than `"here"` or bare URLs.
