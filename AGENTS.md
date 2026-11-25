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
| *Brand Accent (Default Cyan)* | `#0a4651` | `#28b4c8` | Interactive links, active borders, buttons (`--brand-accent`) |
| *Brand Accent Hover* | `#0b6878` | `#67e8f9` | Hover & focus glow on interactive elements (`--brand-accent-hover`) |
| *Brand Accent Muted* | `rgba(10, 70, 81, 0.12)` | `rgba(40, 180, 200, 0.16)` | Search highlights, active row backgrounds, badges (`--brand-accent-muted`) |
| *Brand Accent Gradient* | `linear-gradient(128deg, #0a4651 0%, #0b6878 100%)` | `linear-gradient(128deg, #0d2c32 0%, #114a54 100%)` | Homepage hero callout box background (`--brand-accent-gradient`) |

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

### E. Site-Wide Personalization System (Theme, Dye Accents, Typography)

To allow visitors to customize their visual experience, a global personalization menu is accessible via a **Paint Brush icon** button located in the site header, positioned between the header navigation links and the search button on desktop, and beside the search button in the mobile navigation drawer.

#### 1. Personalization Dimensions & Token Architecture

The personalization system controls three independent dimensions applied as `data-*` attributes on `document.documentElement` (`<html data-theme="..." data-accent="..." data-font="...">`):

##### 1. Theme Mode (`data-theme`)
- **System Sync (`auto` / default)**: Automatically follows the user's OS preference via CSS media query `@media (prefers-color-scheme: dark)`.
- **Light (`light`)**: Forces the Twenty Twenty-Four light base palette (`#f0efed` canvas, `#ffffff` card surfaces, `#111111` contrast text).
- **Dark (`dark`)**: Forces the Twenty Twenty-Four Onyx dark palette (`#131416` canvas, `#1c1e22` elevated surfaces, `#f0f1f3` contrast text).

##### 2. Accent Colors (`data-accent`) — Minecraft Dye Palette
Replaces the hardcoded brand teal with 12 selectable Minecraft-inspired dye & special accent options arranged in a **6 × 2** grid. Each accent defines solid, hover, muted, and gradient tokens adapted for both light and dark themes:

| Dye Name | Attribute | Light Solid | Light Hover | Light Muted | Dark Solid | Dark Hover | Dark Muted |
|---|---|---|---|---|---|---|---|
| **Cyan (Default)** | `cyan` | `#0a4651` | `#0b6878` | `rgba(10, 70, 81, 0.12)` | `#28b4c8` | `#67e8f9` | `rgba(40, 180, 200, 0.16)` |
| **Red** | `red` | `#b02e26` | `#c83830` | `rgba(176, 46, 38, 0.12)` | `#e0554c` | `#f87171` | `rgba(224, 85, 76, 0.18)` |
| **Orange** | `orange` | `#c95a00` | `#e06800` | `rgba(201, 90, 0, 0.12)` | `#f9801d` | `#fb923c` | `rgba(249, 128, 29, 0.18)` |
| **Yellow** | `yellow` | `#9a6e00` | `#b88400` | `rgba(234, 179, 8, 0.18)` | `#facc15` | `#fde047` | `rgba(250, 204, 21, 0.18)` |
| **Lime** | `lime` | `#5e8a00` | `#6f9f00` | `rgba(94, 138, 0, 0.12)` | `#80c71f` | `#a3e635` | `rgba(128, 199, 31, 0.18)` |
| **Green** | `green` | `#3c6114` | `#4d7a1a` | `rgba(60, 97, 20, 0.12)` | `#5e7c16` | `#84cc16` | `rgba(94, 124, 22, 0.18)` |
| **Light Blue** | `light-blue` | `#0284c7` | `#0369a1` | `rgba(2, 132, 199, 0.13)` | `#38bdf8` | `#7dd3fc` | `rgba(56, 189, 248, 0.18)` |
| **Blue** | `blue` | `#2b3fa3` | `#374fc7` | `rgba(43, 63, 163, 0.12)` | `#5865f2` | `#818cf8` | `rgba(88, 101, 242, 0.18)` |
| **Purple** | `purple` | `#742da3` | `#8a38c2` | `rgba(116, 45, 163, 0.12)` | `#a855f7` | `#c084fc` | `rgba(168, 85, 247, 0.18)` |
| **Pink** | `pink` | `#b8326a` | `#cf3e7c` | `rgba(184, 50, 106, 0.12)` | `#f472b6` | `#f9a8d4` | `rgba(244, 114, 182, 0.18)` |
| **Gray** | `gray` | `#4b5563` | `#374151` | `rgba(75, 85, 99, 0.13)` | `#9ca3af` | `#d1d5db` | `rgba(156, 163, 175, 0.18)` |
| **jeb_** | `jeb` | `oklch(0.52 0.18 H)` (8s cycle) | `oklch(0.44 0.18 H+45°)` | `oklch(0.55 0.16 H / 0.14)` | `oklch(0.76 0.16 H)` (8s cycle) | `oklch(0.84 0.14 H+45°)` | `oklch(0.76 0.16 H / 0.18)` |

- **Callout Gradients**:
  - `cyan`: `linear-gradient(128deg, #0a4651 0%, #0b6878 100%)` (dark: `linear-gradient(128deg, #0d2c32 0%, #114a54 100%)`)
  - `red`: `linear-gradient(128deg, #8f201a 0%, #b02e26 100%)` (dark: `linear-gradient(128deg, #3d1412 0%, #5e1c18 100%)`)
  - `orange`: `linear-gradient(128deg, #a64800 0%, #c95a00 100%)` (dark: `linear-gradient(128deg, #421c04 0%, #632906 100%)`)
  - `yellow`: `linear-gradient(128deg, #7d5800 0%, #9a6e00 100%)` (dark: `linear-gradient(128deg, #423204 0%, #634b07 100%)`)
  - `lime`: `linear-gradient(128deg, #4a6d00 0%, #5e8a00 100%)` (dark: `linear-gradient(128deg, #1f3305 0%, #2f4e07 100%)`)
  - `green`: `linear-gradient(128deg, #2d4a0e 0%, #3c6114 100%)` (dark: `linear-gradient(128deg, #172405 0%, #293b0a 100%)`)
  - `light-blue`: `linear-gradient(128deg, #0369a1 0%, #0284c7 100%)` (dark: `linear-gradient(128deg, #0c2d42 0%, #114563 100%)`)
  - `blue`: `linear-gradient(128deg, #1f2f82 0%, #2b3fa3 100%)` (dark: `linear-gradient(128deg, #13173d 0%, #1e245c 100%)`)
  - `purple`: `linear-gradient(128deg, #591e80 0%, #742da3 100%)` (dark: `linear-gradient(128deg, #2a1140 0%, #421863 100%)`)
  - `pink`: `linear-gradient(128deg, #942453 0%, #b8326a 100%)` (dark: `linear-gradient(128deg, #3d1427 0%, #5c1b3a 100%)`)
  - `gray`: `linear-gradient(128deg, #374151 0%, #4b5563 100%)` (dark: `linear-gradient(128deg, #27272a 0%, #3f3f46 100%)`)
  - `jeb`: `linear-gradient(128deg, oklch(0.46 0.18 H) 0%, oklch(0.52 0.18 H+45°) 100%)` (dark: `linear-gradient(128deg, oklch(0.28 0.09 H) 0%, oklch(0.36 0.11 H+45°) 100%)`)

##### 3. Font Presets (`data-font`)
Controls typography hierarchy across headings, body prose, navigation links, and UI components:
- **Default (`default`)**: College Debt signature hybrid — pixel-sharp `'Minecraft', monospace` for primary titles (`h1`, `h2`), site logo subtitle, and header navigation; `'Inter', sans-serif` for body copy, sub-headings (`h3`-`h6`), metadata, tables, and buttons; `'Cardo', serif` for editorial callouts.
- **Sans (`sans`)**: Clean contemporary editorial look — `'Inter', sans-serif` applied universally across all titles, navigation links, body copy, and UI elements. Standard font smoothing enabled.
- **Serif (`serif`)**: High-comfort long-form reading typography — `'Noto Serif', Georgia, serif` (bundled locally at `/assets/fonts/noto-serif/`) applied to titles, headings, and article content for a traditional literary feel.
- **Mojangles (`mojangles`)**: Full retro Minecraft immersion — `'Minecraft', monospace` applied across all site elements including headings, body paragraphs, navigation links, buttons, and badges. Font smoothing strictly disabled (`font-smooth: never !important; -webkit-font-smoothing: none !important;`).

#### 2. Architecture, State & Zero-FOUC Synchronization
1. **Local Storage Keys**:
   - `collegedebt_theme`: `'auto'` | `'light'` | `'dark'`
   - `collegedebt_accent`: `'red'` | `'orange'` | `'yellow'` | `'lime'` | `'green'` | `'cyan'` | `'light-blue'` | `'blue'` | `'purple'` | `'pink'` | `'gray'` | `'jeb'`
   - `collegedebt_font`: `'default'` | `'sans'` | `'serif'` | `'mojangles'`
2. **Anti-FOUC Pre-Paint Execution**: An inline `<script>` placed in `<head>` (in `layouts/_default/baseof.html`) immediately reads `localStorage` and writes `data-theme`, `data-accent`, and `data-font` onto `document.documentElement` before the browser renders the first frame, guaranteeing zero flash of unstyled content on page load or PJAX navigation.
3. **UI Trigger & Menu Layout**:
   - **Trigger**: Paint Brush SVG icon button (`.site-personalize-btn`), styled consistently with `.site-search-btn` (24x24 hit target, transparent background, brand accent hover color). Placed between navigation links and the search button in `layouts/partials/header.html`.
   - **Popover Menu** (`layouts/partials/personalize_modal.html`, `14px` uniform padding): A floating card anchored to the trigger on desktop and positioned centered below the sticky header on mobile. Features:
     - **Theme Row**: 3 horizontal circular buttons (`Auto` SVG split circle, `Light`, `Dark`) with labels underneath.
     - **Accent Swatch Grid**: **6 × 2** grid of 12 circular swatches (no labels) showcasing the Minecraft dye hues plus `Gray` and animated `jeb_` rainbow cycle, with active selection rings and checkmarks.
     - **Font Style Grid**: 4 horizontal `Ag` specimen tiles (`Default`, `Sans`, `Serif`, `Mojangles`), each rendered with its preview typography.
   - **Accessibility**: Full keyboard navigation (<kbd>Escape</kbd> to close, Tab focus trapping via `window.__cdA11y`, initial focus move on open, arrow key focus inside radiogroups, ARIA attributes `aria-haspopup="dialog"`, `aria-expanded`, `role="dialog"`, `aria-modal="true"`).

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
   - Group headers render with left-aligned group titles (`order: 1`, `margin-left: 0`, `margin-right: auto`) and right-aligned collapse chevrons flush to the right margin (`order: 2`, `margin-left: auto`, `margin-right: 0`). Clicking anywhere on the group header row toggles group expansion instantly with transition animations removed.
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

## 6. Accessibility & Screen Reader Standards

All templates, interactive scripts, stylesheets, and content pages follow semantic HTML and WAI-ARIA practices without altering visual appearance for mouse or touch users:

### A. Landmarks, Skip Navigation & Focus Management
1. **Single Landmark Hierarchy**:
   - Every page layout (`index.html`, `_default/*`, `posts/single.html`, `404.html`, `wiki/*`) wraps its primary content in a single `<main id="main-content" tabindex="-1">`.
   - [`layouts/partials/footer.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/footer.html) exposes a single `<footer>` landmark (`contentinfo`); internal layout containers use `<div>`.
   - [`layouts/_default/baseof.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/_default/baseof.html) renders `<a href="#main-content" class="skip-link">Skip to main content</a>` as the first focusable element inside `.wp-site-blocks`, hidden off-screen visually until focused via keyboard.
2. **Keyboard-Only Focus Rings**:
   - Mouse/touch focus outlines remain suppressed via `:focus:not(:focus-visible)`, while interactive triggers and inputs (`.site-search-btn`, `.site-personalize-btn`, `.site-mobile-nav-close`, `.site-search-fallback-*`, `.pagefind-ui__search-*`, `.skip-link`) define explicit `:focus-visible` outlines using `--brand-accent` in [`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css) and [`static/css/theme-personalize.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-personalize.css).
   - Programmatic focus targets (`main#main-content`, `.wiki-page-title`) suppress focus outlines unless `:focus-visible`.
3. **Reduced Motion**:
   - `@media (prefers-reduced-motion: reduce)` in [`static/css/theme-personalize.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-personalize.css) disables continuous `jeb_` rainbow hue-cycling (`@keyframes jeb-rainbow`) and loading spinner animations.

### B. Modals, Drawers, Live Regions & Shortcodes
1. **Shared Dialog Helper (`window.__cdA11y`)**:
   - Defined in [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js) and shared with [`static/js/search.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/search.js), [`static/js/personalize.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/personalize.js), and [`static/js/wiki.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/wiki.js).
   - Provides `trapTab()` (`Tab` / `Shift+Tab` cycling inside open dialogs) and `setBackgroundInert()` (marking `.wp-site-blocks` or sibling children `inert` while an overlay modal is open).
   - Mobile navigation (`#site-mobile-nav-modal`), Search (`#site-search-modal`), and Personalization (`#site-personalize-modal`) all declare `role="dialog"`, `aria-modal="true"`, and restore focus to the invoking trigger when closed via keyboard (<kbd>Escape</kbd> / close button).
   - [`layouts/404.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/404.html) uses the centered College Debt editorial layout with `<main id="main-content" tabindex="-1">`, `wiki-pager-card`-styled `Back to Home` and `Search site` buttons (wiring the search button directly to `#site-search-modal`).
2. **Screen Reader Status & Decorative Elements**:
   - `#site-search-live-status` (`aria-live="polite"`) in [`layouts/partials/search_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/search_modal.html) announces Pagefind result counts.
   - `#wiki-route-announcer` (`aria-live="polite"`) in `wiki/single.html` and `wiki/list.html` announces intra-wiki PJAX transitions and moves focus (`preventScroll: true`) to `.wiki-page-title` when not navigating to an anchor hash.
   - Closed mobile/tablet wiki drawers (`.wiki-sidebar-card` at `<= 820px`, `.wiki-toc-rail` at `<= 1100px`) apply delayed `visibility: hidden` alongside `inert` and `aria-hidden="true"` so off-screen links are excluded from Tab order and assistive technology until opened.
   - Decorative SVGs, Font Awesome icons, and breadcrumb `&rsaquo;` dividers carry `aria-hidden="true"`. Footer arrow indicators use `content: "\2197" / ""` paired with `.sr-only` `" (external link)"` text, and the Oak Sign image link carries a descriptive `aria-label`.
3. **Wiki Components**:
   - Active sidebar navigation items (`layouts/partials/wiki/sidebar.html` & `updateSidebarActive()` in `wiki.js`) and current breadcrumb items (`breadcrumbs.html`) expose `aria-current="page"`; sidebar groups use `<section aria-labelledby="...">`.
   - `initWikiTabs()` in `wiki.js` upgrades `.wiki-tabs` into ARIA `role="tablist"`, `role="tab"` (`aria-selected`, `aria-controls`, roving `tabindex`), and `role="tabpanel"` (`aria-labelledby`, `hidden`), supporting `ArrowLeft`, `ArrowRight`, `Home`, and `End` keys.
   - [`layouts/shortcodes/hint.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/shortcodes/hint.html) prepends `<span class="sr-only">{{ $type | title }}: </span>` so callout severity is never conveyed by color alone.
   - [`layouts/shortcodes/embed.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/shortcodes/embed.html) accepts an optional `title` parameter for YouTube `<iframe>` titles and external embed card labels.

### C. Content Authoring Rules (`content/`)
1. **Heading Hierarchy**: Templates render each page title as `<h1>`. All Markdown body headings must start at `##` (`h2`) and increment without skipping levels (`h1` → `h2` → `h3`); never leave empty headings.
2. **Images & Figures**: Every informative `<img>` must include descriptive `alt` text; omit empty `<figcaption></figcaption>` elements.
3. **Tables & Links**: Raw HTML `<table>` blocks must include non-empty `<thead><th>` headers with `scope="col"` (or `scope="row"` where appropriate). Links must use descriptive text rather than generic phrases (`here`, `this page`) or bare URLs.

---

## 7. Summary of Key Files

| File | Purpose |
|---|---|
| [`static/css/wp-theme.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wp-theme.css) | Core Twenty Twenty-Four Gutenberg variables, layout helpers, and block styles. |
| [`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css) | Custom layout tweaks, Minecraft/Cardo font definitions, header/footer spacing overrides, `.sr-only`/`.skip-link` utilities, `:focus-visible` outlines, and subpage search typography. |
| [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js) | Accessible mobile overlay menu controller and shared `window.__cdA11y` focus-trap/inert helper. |
| [`static/js/search.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/search.js) | Pagefind search controller (arrow key navigation, 404 modal handoff, live result announcements, focus trap/restoration, multi-frame auto-highlight). |
| [`layouts/_default/baseof.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/_default/baseof.html) | Root layout shell with `<head>`, anti-FOUC pre-paint script, skip link, theme stylesheets, and scripts. |
| [`layouts/partials/header.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/header.html) | Header partial containing logo, search trigger, and responsive navigation. |
| [`layouts/partials/search_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/search_modal.html) | Frosted search overlay modal partial housing the fixed search bar, scrollable Pagefind results container, and bottom keyboard hints footer. |
| [`layouts/partials/personalize_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/personalize_modal.html) | Site-wide personalization popover modal with controls for theme mode, Minecraft dye accent colors, and typography presets. |
| [`static/js/personalize.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/personalize.js) | Client-side state manager and event controller for theme mode, accent colors, and font presets with `localStorage` persistence. |
| [`static/css/theme-personalize.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-personalize.css) | Personalization popover styles, 12 Minecraft dye accent color definitions (`[data-accent]`), typography override presets (`[data-font]`), `:focus-visible` trigger rings, and `prefers-reduced-motion` guards. |
| [`layouts/partials/footer.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/footer.html) | Footer partial containing credits, links with `.sr-only` external indicators, and labeled Oak Sign link. |
| [`layouts/shortcodes/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/shortcodes/) | Custom Hugo shortcodes for wiki elements (`hint`, `tabs`, `stepper`, `embed`, `content-ref`). |
| [`layouts/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/wiki/) | Wiki templates (`single.html` article layout, `list.html` section listing) with `#main-content` and `#wiki-route-announcer`. |
| [`layouts/partials/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/wiki/) | Wiki modular partials (`sidebar.html`, `breadcrumbs.html`, `cover.html`, `pager.html`, `toc.html`, `icon.html`). |
| [`static/css/wiki.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wiki.css) | 1440px 3-column desktop layout, floating white card sidebar, delayed off-screen drawer `visibility` transitions, and typography styles for the wiki. |
| [`static/css/theme-dark.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-dark.css) | Twenty Twenty-Four Onyx dark theme system with automatic browser preference detection and manual toggle support. |
| [`static/js/wiki.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/wiki.js) | Interactive wiki controller (ARIA tab switcher, TOC scroll highlight, drawer `inert`/focus management, PJAX navigation with live route announcements). |
| [`static/css/all.min.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/all.min.css) | Font Awesome 6 Free CSS icon library. |
| [`static/webfonts/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/webfonts/) | Bundled Font Awesome webfont files (`.woff2`, `.ttf`). |
| [`content/wiki/`](file:///Users/cherryquartzio/Repos/college-debt.github.io/content/wiki/) | Wiki markdown pages (29 content pages + group index sections) published under `/wiki/`. |
| [`.github/workflows/deploy.yml`](file:///Users/cherryquartzio/Repos/college-debt.github.io/.github/workflows/deploy.yml) | GitHub Actions CI/CD configuration deploying the site to GitHub Pages. |

