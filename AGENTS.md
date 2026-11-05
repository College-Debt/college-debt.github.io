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
     - At `<= 820px`: Left sidebar transforms into an offscreen slide drawer (`transform: translateX(-100%)`). Toggled via a dedicated hamburger button beside the logo in the sticky header, which toggles to a close (`✕`) icon in-place. Background content blurs via `backdrop-filter: blur(4px)`.
     - At `<= 1100px`: Table of Contents transforms into an offscreen slide drawer (`transform: translateX(100%)`) on the right rail. Toggled via a list icon button on the right side of the breadcrumbs row (only rendered when 2+ headings exist).
     - Global header navigation collapses into a distinct 3-dots (`···`) menu icon to visually differentiate from the wiki sidebar hamburger.
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

---

## 5. Summary of Key Files

| File | Purpose |
|---|---|
| [`static/css/wp-theme.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wp-theme.css) | Core Twenty Twenty-Four Gutenberg variables, layout helpers, and block styles. |
| [`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css) | Custom layout tweaks, Minecraft/Cardo font definitions, header/footer spacing overrides. |
| [`static/js/nav.js`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/js/nav.js) | Accessible vanilla JavaScript for opening/closing mobile overlay menu. |
| [`layouts/_default/baseof.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/_default/baseof.html) | Root layout shell with `<head>`, meta tags, theme stylesheets, and footer scripts. |
| [`layouts/partials/header.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/header.html) | Header partial containing logo and responsive navigation. |
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

