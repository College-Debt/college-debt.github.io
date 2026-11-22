# AGENTS.md — Architecture & Design Guide for College Debt SMP (`collegedebt.app`)

This document provides technical context, design system specifications, and architectural guidelines for AI agents and human contributors working on the College Debt SMP website and wiki.

---

## 1. Project Overview & Background

### Purpose
**College Debt SMP** is a private Minecraft survival multiplayer server created by `@Zeroaf` and `@CherryQuartzio`. The website (`collegedebt.app`) serves two unified functions:
1. **Public Landing Site & Blog**: Server announcements, update logs, server status, and community information.
2. **Internal Knowledge Wiki** (`/wiki/`): Gameplay guides, server configurations, modpack documentation, homelab/tech architecture, and community lore (migrated from GitBook).

### History & Platform Evolution
- **Phase 1 (WordPress)**: Originally designed and hosted using WordPress with the **Twenty Twenty-Four** full-site editing theme.
- **Phase 2 (Static Jekyll on `gh-pages`)**: Exported to a static site and rebuilt with Jekyll.
- **Phase 3 (Modern Hugo on `main`)**: Completely refactored to **Hugo** (Extended v0.145.0+). Lingering WordPress runtime bloat was pruned, styles consolidated, and automated GitHub Actions CI/CD established.
- **Phase 4 (Wiki Convergence)**: Migration of the GitBook wiki into Hugo under `content/wiki/`.

### Repository & Branching Strategy
- **`main`**: The primary production source branch. All Hugo source files, layouts, assets, and workflows reside here. Commits to `main` trigger automated deployment.
- **`gh-pages`**: Preserved strictly as an archive of the legacy Jekyll codebase. Do not overwrite or delete.
- **Deployment**: GitHub Pages deployed via GitHub Actions workflow (`.github/workflows/deploy.yml`).

---

## 2. Technical Stack & Repository Structure

### Stack
- **Static Site Generator**: Hugo Extended (v0.145.0+)
- **Hosting**: GitHub Pages with custom domain `collegedebt.app`
- **CI/CD**: GitHub Actions (`actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`)
- **Markdown Engine**: Goldmark (with `[markup.goldmark.renderer] unsafe = true` to allow rich HTML markup)

### Directory Structure
```
college-debt.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated Hugo build & Pages deployment
├── content/
│   ├── about.md                  # /about/ page
│   ├── posts/                    # Server announcements & updates
│   │   ├── 2024-07-30-welcome.md
│   │   ├── 2024-08-06-beyondvanilla.md
│   │   └── 2026-07-31-qol.md
│   └── wiki/                     # Staged wiki content (29+ pages)
│       ├── _index.md             # Wiki landing page & cascade build control
│       ├── about/                # Lore & help
│       ├── college-debt-smp/     # Gameplay, features, server configs
│       ├── tech-stuff/           # Homelab, cloud accounts, Tailscale
│       └── free-stuff.md
├── layouts/
│   ├── _default/
│   │   ├── baseof.html           # Core HTML shell (head, nav, body, footer)
│   │   ├── single.html           # Standard page layout (/about/)
│   │   ├── list.html             # Generic list template
│   │   └── term.html             # Taxonomy term template (/category/*, /author/*)
│   ├── index.html                # Homepage layout
│   ├── 404.html                  # 404 error page layout
│   ├── posts/
│   │   └── single.html           # Blog post layout with featured image & pagination
│   ├── partials/
│   │   ├── header.html           # Global site header with responsive modal navigation
│   │   ├── footer.html           # Dual-column footer with credits & Oak Sign badge
│   │   └── post_list.html        # Reusable blog post teaser list
│   └── shortcodes/               # Wiki components (hint, tabs, stepper, embed, etc.)
├── static/
│   ├── CNAME                     # collegedebt.app domain pointer
│   ├── assets/
│   │   ├── fonts/                # Minecraft, Cardo, and Inter web fonts
│   │   ├── images/               # Logos, hero images, thumbnails
│   │   └── wiki/                 # 14 images migrated from GitBook .gitbook/assets/
│   ├── css/
│   │   ├── wp-theme.css          # Consolidated Twenty Twenty-Four base block styles
│   │   └── custom.css            # College Debt custom typography & layout overrides
│   └── js/
│       └── nav.js                # Vanilla JS responsive modal navigation controller
├── hugo.toml                     # Site configuration & taxonomy mappings
└── AGENTS.md                     # This documentation file
```

---

## 3. Design System & Aesthetics (WordPress Twenty Twenty-Four Foundation)

The site visual design is derived directly from the WordPress **Twenty Twenty-Four (TT4)** block theme, customized with Minecraft-inspired pixel aesthetics, warm neutral backgrounds, and clean editorial typography.

### A. Color Palette & Tokens
Colors are declared via CSS Custom Properties in [`static/css/wp-theme.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wp-theme.css) and adapted for dark mode in [`static/css/theme-dark.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-dark.css):

| CSS Variable | Light Value | Dark Value (Onyx) | Usage |
|---|---|---|---|
| `--wp--preset--color--base` | `#f0efed` | `#131416` | Body canvas, outer background tint |
| `--wp--preset--color--base-2` | `#ffffff` | `#1c1e22` | Pure white / dark elevated surface (cards, buttons, inputs) |
| `--wp--preset--color--contrast` | `#111111` | `#f0f1f3` | Primary text, deep headings / soft white text |
| `--wp--preset--color--contrast-2` | `#636363` | `#9ca3af` | Subtitles, metadata ("by CherryQuartzio", post dates) |
| `--wp--preset--color--contrast-3` | `#a4a4a4` | `#374151` | Horizontal separators (`<hr>`), subtle borders |
| `--wp--preset--color--accent` | `#cfcabe` | `#2a2e35` | Subtle accent tint / card structural borders |
| `--wp--preset--color--accent-2` | `#c2a990` | `#d4bba2` | Warm parchment accent |
| *Brand Teal Gradient* | `linear-gradient(128deg, #0a4651 0%, #0b6878 100%)` | `linear-gradient(128deg, #0d2c32 0%, #114a54 100%)` | Homepage hero callout box background |
| *Brand Teal Solid* | `#0a4651` | `#28b4c8` | Search buttons, links, primary interactive accents |

### B. Typography Stack
Three distinct font families are used intentionally across the site:

1. **Minecraft Regular (`Minecraft`, monospace)**
   - Source: `/assets/fonts/MinecraftRegular-Bmg3.otf`
   - Usage: Primary page titles (`h1`, `h2`), site logo subtitle, and header navigation links (`.site-header-nav`).
   - **Critical Rendering Rule**: Font smoothing must be explicitly disabled to preserve pixel-sharp edges:
     ```css
     font-family: 'Minecraft', monospace !important;
     -webkit-font-smoothing: none !important;
     -moz-osx-font-smoothing: unset !important;
     font-smooth: never !important;
     text-rendering: geometricPrecision !important;
     ```

2. **Inter (`Inter`, sans-serif)**
   - Source: `/assets/fonts/inter/Inter-VariableFont_slnt,wght.woff2` (Weights 300–900)
   - Usage: Body copy, paragraphs, sub-headings (`h3`, `h4`, `h5`, `h6`), metadata badges, lists, tables, and form inputs.

3. **Cardo (`Cardo`, serif)**
   - Source: `/assets/fonts/cardo/` (Normal 400, Italic 400, Bold 700)
   - Usage: Editorial serif accent used where `.has-heading-font-family` is applied.

### C. Spacing Scale & Container Hierarchy
Gutenberg-style spacing tokens provide fluid and responsive padding/margins:

- `--wp--preset--spacing--10`: `1rem` (16px) — Small inner gaps, metadata badge spacing.
- `--wp--preset--spacing--20`: `min(1.5rem, 2vw)` — Standard component margins, post title gaps.
- `--wp--preset--spacing--30`: `min(2.5rem, 3vw)` — Section separation, post footer padding.
- `--wp--preset--spacing--40`: `min(4rem, 5vw)` — Horizontal padding on container wrappers.
- `--wp--preset--spacing--50`: `min(6.5rem, 8vw)` — Wide section outer margins.

**Layout Classes**:
- `.is-layout-constrained`: Max-width constrained content area (~620px for text readability).
- `.alignwide`: Stretches beyond text column to a wide container (~1280px).
- `.alignfull`: Full-width 100vw section container.
- `.wp-site-blocks`: Top-level flex wrapper ensuring sticky footer alignment (`min-height: 100vh`).
- `main`, `.wp-site-blocks > main`: `min-height: calc(100vh - 83px);` keeps footer below the fold on short pages.

### D. Key Component Patterns

1. **Site Header** (`layouts/partials/header.html`):
   - Background: `#f0efedc9` with `backdrop-filter` feel.
   - SVG Brand Logo (`/assets/images/collegedebt.svg`, width 200px, height 46px).
   - Navigation links in Minecraft font (font size 20px, uppercase feel, hover color `#636363`).
   - Responsive Mobile Drawer: Hamburger button opens full-screen overlay modal with smooth fade-in (`overlay-menu__fade-in-only`), controlled via [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js).

2. **Hero Section** (`layouts/index.html`):
   - Centered large title: `It's College Debt!` in Minecraft font (`font-size: 2.25rem`, letter spacing 2px).
   - Subtitle: `anteaters with a turtle`.
   - Hero image: Tort the turtle (`/assets/images/tort.jpg`), full width within `.alignwide`.

3. **Callout Banner** (`home-callout-box`):
   - Background: Teal gradient `rgb(10, 70, 81)` to `rgb(11, 104, 120)`.
   - Border radius: `8px`.
   - Title & text in white/light colors.
   - Button (`home-wiki-button`): Sharp drop shadow `var(--wp--preset--shadow--sharp)` (`6px 6px 0px rgba(0, 0, 0, 0.2)`), zero border radius, high-contrast dark text on white.

4. **Post Card Template** (`layouts/partials/post_list.html`):
   - Separated by thin horizontal rule: `.wp-block-separator` (color `#a4a4a4`).
   - Two-column responsive row: Left column has post title in bold Inter font (font-size `1.15rem`), right column has right-aligned metadata:
     - Date formatted as `Jan 2, 2006`
     - Author link (`/author/<slug>/`)
     - Category link (`/category/<slug>/`)

5. **Post Single Page** (`layouts/posts/single.html`):
   - Featured Image thumbnail (rounded 8px, cover ratio).
   - Minecraft H1 title.
   - Author, date, category badges.
   - Standardized vertical content rhythm (`.entry-content h2`, `h3` have generous top margin: `1.75em–2em`).
   - Chronological previous/next post navigation footer (`← Previous: ...` / `Next: ... →`).

6. **Site Footer** (`layouts/partials/footer.html`):
   - Background: Pure white `#ffffff` (`has-base-2-background-color`).
   - Left column: Navigation links with diagonal arrow indicator `↗` (`.is-style-arrow-link`), copyright note, Minecraft disclaimer.
   - Right column: Oak Sign badge thumbnail (`Oak_Sign_JE3.jpg`, width 82px) linking to YouTube video.

7. **Standalone Button Pattern (`wiki-pager-card` Foundation)**:
   - For all standalone buttons across the site theme, a single consistent styling based on `.wiki-pager-card` is used:
     - **Border**: Thin 1px border using `var(--wp--preset--color--accent, #cfcabe)` (dark: `#2a2e35`).
     - **Corners**: 8px border-radius (`border-radius: 8px`).
     - **Background**: Shaded surface `var(--wp--preset--color--base-2, #ffffff)` (dark: `#1c1e22`).
     - **Typography**: Neutral primary text `var(--wp--preset--color--contrast, #111111)` in normal weight (`font-weight: 400`, `font-family: 'Inter', sans-serif`).
     - **Hover & Interaction**: Subtle shadow elevation (`box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05)` light, `0 1px 4px rgba(0, 0, 0, 0.3)` dark), brand teal accent border (`#0a4651` light, `var(--brand-teal)` dark), and teal text color transition.
     - **Scope**: Applied to wiki pagination cards (`.wiki-pager-card`), Pagefind search overlay "Load more results" button (`#site-search-container .pagefind-ui__button`), and future standalone action buttons.

---

## 4. Wiki Design & Integration Guidelines

When creating the wiki layout and templates in upcoming phases, **the wiki must look and feel like an organic part of the College Debt site**, extending Twenty Twenty-Four rather than looking like a generic Bootstrap or Docusaurus site.

### Architectural Rules for the Wiki
1. **Inherit Global Shell**:
   - The wiki layout must inherit the exact global header and footer from `baseof.html` (or partials `header.html` and `footer.html`).
   - Background remains `--wp--preset--color--base` (`#f0efed`) for the outer body and `--wp--preset--color--base-2` (`#ffffff`) for content panels.

2. **Typography Consistency**:
   - Wiki page titles (`h1`, `h2`) must use `'Minecraft', monospace` with disabled font-smoothing.
   - Sidebar navigation, body text, tables, and shortcodes must use `'Inter', sans-serif`.
   - Section badges and categories should use clean, subtle styling matching the blog taxonomy badges.

3. **Sidebar Navigation & Mobile Responsive Design**:
   - Must replicate the GitBook structure parsed from `SUMMARY.md`:
     - Group headers: **About**, **College Debt SMP**, **Tech stuff**, **Extra**.
     - Hierarchical nesting: Subsections like *College Debt lore*, *Play*, *Features*, *Server system* should display their child pages indented under them.
     - Active page indicator: Highlight with dark contrast or teal accent (`#0a4651`).
     - Collapsible on desktop with chevron button; defaults to hidden for non-active subtrees.
   - **Mobile & Tablet Drawer Pattern**:
     - At `<= 820px`: Left sidebar transforms into an offscreen slide drawer (`transform: translateX(-100%)`). Toggled via a dedicated sidebar icon button (custom split-panel SVG) beside the logo in the sticky header, which toggles to a close (`✕`) icon in-place. Background content blurs via `backdrop-filter: blur(4px)`.
     - At `<= 1100px`: Table of Contents transforms into an offscreen slide drawer (`transform: translateX(100%)`) on the right rail. Toggled via a list icon button on the right side of the breadcrumbs row (only rendered when 2+ headings exist).
     - Global header navigation collapses into a distinct hamburger (`☰`) menu icon on mobile layout, with the site search button placed to its left.
     - Drawers can be dismissed via backdrop tap, <kbd>Escape</kbd> key, close buttons, or link navigation.

4. **Wiki Components & Shortcodes**:
   The wiki content uses custom shortcodes that must be styled to match TT4:
   - `{{< hint "info|warning|danger|tip" >}}`:
     - Rounded corners: `8px`.
     - Background: Tinted light surface with colored left border (3px solid `#0a4651` for info, `#fcb900` for warning, `#cf2e2e` for danger).
     - Text: Inter font, font-size `0.95rem`.
   - `{{< tabs >}}` & `{{< tab "Title" >}}`:
     - Tab bar with border-bottom in `#a4a4a4`.
     - Active tab highlighted with bold text and dark bottom accent line.
   - `{{< stepper >}}` & `{{< step >}}`:
     - Numbered steps with circled badges using teal accent `#0a4651` and white text.
   - `{{< content-ref url="..." >}}`:
     - Reference cards styled with light background, 1px border (`#cfcabe`), rounded 8px, with hover elevation.
   - `{{< embed url="..." >}}`:
     - YouTube iframes with 16:9 ratio and rounded 8px corners.

5. **Staging / Publication Toggle**:
   - The wiki content is currently staged under `content/wiki/` with:
     ```yaml
     cascade:
       _build:
         render: never
         list: never
     ```
   - When the wiki layout templates (`layouts/wiki/single.html`, `layouts/wiki/list.html`, etc.) are completed and ready for launch, simply remove or change this cascade setting to publish all wiki pages.

6. **Sidebar Stability & Seamless Intra-Wiki Navigation**:
   - **Zero Flash/Jitter Navigation**: All intra-wiki link clicks (`/wiki/*`) are intercepted via client-side PJAX in [`static/js/wiki.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/wiki.js). The center article column (`.wiki-content-wrapper`) and TOC (`.wiki-toc-rail`) swap seamlessly via background `fetch` + `DOMParser`. The sidebar is never torn down or reloaded during navigation.
   - **Synchronous Scroll & Section State Restoration**: An inline script placed immediately after `<aside class="wiki-sidebar-card">` in [`layouts/partials/wiki/sidebar.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/wiki/sidebar.html) restores `scrollTop` and all previously opened subsection paths (`wiki_open_sections`) from `sessionStorage` before the browser paints the first frame on refresh or direct loads.
   - **Gutter Stability**: `.wiki-sidebar-card` and `.wiki-toc-rail` use `scrollbar-gutter: stable;` in [`static/css/wiki.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wiki.css) to prevent horizontal shifts.
   - **Zero Color Flash on Load**: Active item classes (`.wiki-nav-row.is-active`, `.wiki-nav-item.is-active`) have `transition: none !important;` in light and Onyx dark modes.

---

## 5. Status Page & Server Infrastructure Monitoring (Uptime Kuma)

The public status page (`status.collegedebt.app`) is self-hosted using **Uptime Kuma** on Proxmox homelab LXC 101 (`10.67.1.12:3001`), migrating away from third-party hosted Phare.

### Network Topology & Monitoring Architecture
1. **Minecraft Server Multiplexing**:
   - Both Minecraft servers run on an Oracle Cloud Infrastructure (OCI ARM) Ampere node (`165.1.77.175` / Tailscale `100.70.90.117`).
   - `minecraft-router` listens on port `25565` and demultiplexes incoming traffic based on the requested SNI/handshake hostname:
     - `smp.collegedebt.app`: Fabric-based vanilla server (**College Debt SMP (Vanilla)**).
     - `cobble.collegedebt.app`: Cobbleverse Fabric modpack server (**Cobble Debt (Cobbleverse)**).
   - Uptime Kuma monitors both servers using native `gamedig` (`type: minecraft`) probes over port `25565`, retrieving real-time player counts, ping latency, version tags, and MOTDs.
2. **Infrastructure Health Probes**:
   - `OCI ARM Host (oracle-ampere)`: TCP port 22 probe to `165.1.77.175` to monitor host OS and network connectivity.
   - `Minecraft Router (minecraft-router)`: TCP port 25565 probe to `165.1.77.175` to detect router proxy health independently of container restarts.
   - `Switch LAN Play (switch-lan-play)`: TCP port 11451 probe to `10.0.0.99` (node `OCI Micro`) to monitor switch-lan-play server and embedded Koa `/info` service. Route `10.0.0.0/24 via 10.67.1.6` is persisted in `/etc/network/interfaces` on LXC 101.
3. **Public Ingress via Cloudflare Tunnel**:
   - Managed through Cloudflare Tunnel daemon on homelab LXC 109 (`cloudflared`).
   - Hostname `status.collegedebt.app` routes directly to `http://10.67.1.12:3001` with WebSocket support enabled.
   - Uptime Kuma database (`status_page_cname`) maps `status.collegedebt.app` to status page ID 1, serving the customized College Debt status page at the root URL `/`.
4. **Theme Parity**:
   - Custom CSS injected into the Uptime Kuma status page applies the Twenty Twenty-Four light/Onyx dark palettes (`#f0efed`/`#131416`), `Minecraft` pixel headings, and `Inter` sans-serif typography matching the main site.
   - Fonts are loaded directly from the main site CDN (`https://collegedebt.app/assets/fonts/inter/Inter-VariableFont_slnt,wght.woff2` and `MinecraftRegular-Bmg3.otf`).
   - Group headers render with right-aligned collapse chevrons flush to the right margin (`margin-right: 0`, `padding-right: 0`).
   - Status page description block has horizontal margins and padding removed to align flush with the status banners and monitor cards.
5. **GameDig Telemetry Companion Service (`gamedig-sync`)**:
   - **Purpose**: Uptime Kuma's core monitors drop GameDig telemetry (player counts and game versions) from status page display. A companion daemon runs alongside Uptime Kuma to expose this data dynamically via native monitor tags (`monitor_tag` in `kuma.db`).
   - **Stack & Deployment**:
     - Service defined in Docker Compose at `/opt/dockhand/data/stacks/Marionet/uptime-kuma/compose.yaml` (mirrored to `/opt/uptime-kuma/docker-compose.yml`).
     - Uses `louislam/uptime-kuma:2` container image (leveraging Node.js 22, native `node:sqlite`, and bundled `gamedig` without installing external dependencies).
     - Daemon script located at `/opt/uptime-kuma/gamedig-sync/sync.js`.
     - Polling interval: 60s (controlled via `POLL_INTERVAL_SECONDS`).
   - **Target Configuration Schema**:
     Targets are configured purely via environment variables in the Compose file without modifying the `uptime-kuma` service definition:
     ```yaml
     TARGET_1_NAME: "College Debt SMP (Vanilla)"
     TARGET_1_HOST: "smp.collegedebt.app"
     TARGET_1_PORT: "25565"
     TARGET_1_TAG_PLAYERS: "Players"
     TARGET_1_TAG_VERSION: "Version"
     TARGET_1_COLOR_PLAYERS: "#555555"
     TARGET_1_COLOR_VERSION: "#0a4651"
     TARGET_1_VERSION_PREFIX: "Fabric "
     ```
   - **Database WAL Concurrency**: Writes directly to SQLite `tag` and `monitor_tag` tables in `/opt/uptime-kuma/data/kuma.db` concurrently with Uptime Kuma using WAL mode.
6. **Routine Reboot Maintenance Window**:
   - **Context**: The `cdsmp` container on OCI ARM undergoes a daily automated restart executed by the `cdsmp-restart` sidecar at 11:00 UTC (10-minute warning countdown starting at 11:00 UTC, kicking players and rebooting container at 11:10 UTC, returning online by ~11:13 UTC).
   - **Maintenance Configuration**:
     - Managed in Uptime Kuma SQLite (`maintenance` table, ID: 1).
     - Strategy: `cron` (`0 11 * * *`), duration: 900s (15 minutes, covering 11:00 to 11:15 UTC daily), timezone: `UTC`.
     - Linked to Monitor 2 (`College Debt SMP (Vanilla)`) via `monitor_maintenance`.
     - Intentionally omitted from `maintenance_status_page` so no global banner clutter appears on the status page.
   - **Status Page & SLA Behavior**:
     - During the maintenance window, Uptime Kuma suppresses down penalties and flags the monitor status as `MAINTENANCE` (code 3), displaying **Maintenance** rather than "Down".
     - Companion daemon `gamedig-sync` checks maintenance status: if probe fails during the reboot window, it sets tag `Players: Maintenance` instead of `Offline`.

---

## 6. Summary of Key Files

| File | Purpose |
|---|---|
| [`static/css/wp-theme.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wp-theme.css) | Core Twenty Twenty-Four Gutenberg variables, layout helpers, and block styles. |
| [`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css) | Custom layout tweaks, Minecraft/Cardo font definitions, header/footer spacing overrides. |
| [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js) | Accessible vanilla JavaScript for opening/closing mobile overlay menu. |
| [`static/js/search.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/search.js) | Pagefind search controller (arrow key navigation for parent & subpage items, background preloading, focus management, fallback input handler). |
| [`layouts/_default/baseof.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/_default/baseof.html) | Root layout shell with `<head>`, meta tags, theme stylesheets, and footer scripts. |
| [`layouts/partials/header.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/header.html) | Header partial containing logo, search trigger, and responsive navigation. |
| [`layouts/partials/search_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/search_modal.html) | Frosted search overlay modal partial housing the fixed search bar, scrollable Pagefind results container, and bottom keyboard hints footer. |
| [`layouts/partials/footer.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/footer.html) | Footer partial containing credits, links, and Oak Sign icon. |
| [`layouts/shortcodes/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/shortcodes/) | Custom Hugo shortcodes for wiki elements (`hint`, `tabs`, `stepper`, `embed`, `content-ref`). |
| [`layouts/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/wiki/) | Wiki templates (`single.html` article layout, `list.html` section listing). |
| [`layouts/partials/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/wiki/) | Wiki modular partials (`sidebar.html`, `breadcrumbs.html`, `cover.html`, `pager.html`, `toc.html`, `icon.html`). |
| [`static/css/wiki.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wiki.css) | 1440px 3-column desktop layout, floating white card sidebar, and typography styles for the wiki. |
| [`static/css/theme-dark.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-dark.css) | Twenty Twenty-Four Onyx dark theme system with automatic browser preference detection and manual toggle support. |
| [`static/js/wiki.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/wiki.js) | Interactive wiki scripts (tab panels switcher and Table of Contents scroll highlight). |
| [`static/css/all.min.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/all.min.css) | Font Awesome 6 Free CSS icon library. |
| [`static/webfonts/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/webfonts/) | Bundled Font Awesome webfont files (`.woff2`, `.ttf`). |
| [`content/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/content/wiki/) | Wiki markdown pages (29 content pages + group index sections) published under `/wiki/`. |
| [`.github/workflows/deploy.yml`](file:///Users/cherryquartzio/Repos/college-debt.github.io/.github/workflows/deploy.yml) | GitHub Actions CI/CD configuration deploying the site to GitHub Pages. |

