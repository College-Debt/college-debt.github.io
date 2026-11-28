# DESIGN.md — Design System & UI Component Specification (`collegedebt.app`)

Visual design, color tokens, typography, layout metrics, and component parameters for the **College Debt SMP** website, wiki, Paintings Studio, and companion properties. Derived from WordPress **Twenty Twenty-Four (TT4)** with custom Minecraft pixel accents, Onyx dark mode, and a 12-dye user personalization system.

---

## 1. Color System & Personalization Tokens

### A. Surface & Text Tokens
Defined in [`static/css/wp-theme.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wp-theme.css) and adapted for dark mode in [`static/css/theme-dark.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-dark.css) (activated automatically via `@media (prefers-color-scheme: dark)` when `data-theme="auto"`, or explicitly via `html[data-theme="dark"]`):

| Token | Light | Dark (Onyx) | Role |
|---|---|---|---|
| `--wp--preset--color--base` | `#f0efed` | `#131416` | Page canvas, subtle recessed inputs (`pt-input`, `pt-stepper`) |
| `--wp--preset--color--base-2` | `#ffffff` | `#1c1e22` | Elevated surfaces (cards, popovers, dialogs, footer, buttons) |
| `--wp--preset--color--contrast` | `#111111` | `#f0f1f3` | Primary copy & headings |
| `--wp--preset--color--contrast-2` | `#636363` | `#9ca3af` | Secondary copy, field labels, dates, author metadata |
| `--wp--preset--color--contrast-3` | `#a4a4a4` | `#374151` | Rules (`<hr>`), pager separators |
| `--wp--preset--color--accent` | `#cfcabe` | `#2a2e35` | Card borders, dividers, control outlines |
| `--wp--preset--color--accent-2` | `#c2a990` | `#d4bba2` | Warm parchment accent |
| `--header-bg` | `#f0efedc9` | `rgba(19, 20, 22, 0.85)` | Translucent sticky header background |
| `--backdrop-scrim` | `rgba(240, 239, 237, 0.75)` | `rgba(10, 11, 13, 0.75)` | Frosted modal & lightbox backdrop |

### B. Brand Accent Tokens & 12-Dye Palette (`data-accent`)
Declared in [`static/css/theme-personalize.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/theme-personalize.css) and exposed as `--brand-accent`, `--brand-accent-hover`, `--brand-accent-muted`, `--brand-accent-gradient`, and `--brand-accent-contrast` (`--brand-teal*` aliases `--brand-accent*`):

| Attribute | Light Solid | Light Hover | Light Muted | Dark Solid | Dark Hover | Dark Muted | Dark Contrast Text |
|---|---|---|---|---|---|---|---|
| `cyan` (default) | `#0a4651` | `#0b6878` | `rgba(10, 70, 81, 0.12)` | `#28b4c8` | `#67e8f9` | `rgba(40, 180, 200, 0.16)` | `#111111` |
| `red` | `#b02e26` | `#c83830` | `rgba(176, 46, 38, 0.12)` | `#e0554c` | `#f87171` | `rgba(224, 85, 76, 0.18)` | `#ffffff` |
| `orange` | `#c95a00` | `#e06800` | `rgba(201, 90, 0, 0.12)` | `#f9801d` | `#fb923c` | `rgba(249, 128, 29, 0.18)` | `#111111` |
| `yellow` | `#9a6e00` | `#b88400` | `rgba(234, 179, 8, 0.18)` | `#facc15` | `#fde047` | `rgba(250, 204, 21, 0.18)` | `#111111` |
| `lime` | `#5e8a00` | `#6f9f00` | `rgba(94, 138, 0, 0.12)` | `#80c71f` | `#a3e635` | `rgba(128, 199, 31, 0.18)` | `#111111` |
| `green` | `#3c6114` | `#4d7a1a` | `rgba(60, 97, 20, 0.12)` | `#5e7c16` | `#84cc16` | `rgba(94, 124, 22, 0.18)` | `#ffffff` |
| `light-blue` | `#0284c7` | `#0369a1` | `rgba(2, 132, 199, 0.13)` | `#38bdf8` | `#7dd3fc` | `rgba(56, 189, 248, 0.18)` | `#111111` |
| `blue` | `#2b3fa3` | `#374fc7` | `rgba(43, 63, 163, 0.12)` | `#5865f2` | `#818cf8` | `rgba(88, 101, 242, 0.18)` | `#ffffff` |
| `purple` | `#742da3` | `#8a38c2` | `rgba(116, 45, 163, 0.12)` | `#a855f7` | `#c084fc` | `rgba(168, 85, 247, 0.18)` | `#ffffff` |
| `pink` | `#b8326a` | `#cf3e7c` | `rgba(184, 50, 106, 0.12)` | `#f472b6` | `#f9a8d4` | `rgba(244, 114, 182, 0.18)` | `#111111` |
| `gray` | `#4b5563` | `#374151` | `rgba(75, 85, 99, 0.13)` | `#9ca3af` | `#d1d5db` | `rgba(156, 163, 175, 0.18)` | `#111111` |
| `jeb` | `oklch(0.52 0.18 H)` | `oklch(0.44 0.18 H+45deg)` | `oklch(0.55 0.16 H / 0.14)` | `oklch(0.76 0.16 H)` | `oklch(0.84 0.14 H+45deg)` | `oklch(0.76 0.16 H / 0.18)` | `#ffffff` / `#111111` |

*Light `--brand-accent-contrast` is `#ffffff` across all 12 dyes. `jeb` animates `--jeb-hue` over an 8s linear cycle and stops under `prefers-reduced-motion: reduce`.*

### C. Persistence & Zero-FOUC Initialization
- `localStorage` keys: `collegedebt_theme` (`auto` | `light` | `dark`), `collegedebt_accent` (12 dyes above), `collegedebt_font` (`default` | `sans` | `serif` | `mojangles`).
- `sessionStorage` hint: `collegedebt_auth_hint` (`"1"` | `"0"`) drives `data-account="signed-in"` on initial load so the Key/Profile header icon does not flicker before `/cdn-cgi/access/get-identity` resolves.
- An inline script in `<head>` ([`layouts/_default/baseof.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/_default/baseof.html)) applies `data-theme`, `data-accent`, `data-font`, and `data-account` synchronously before first paint.

---

## 2. Typography & Spacing

### A. Font Families
1. **Minecraft Regular (`'Minecraft', monospace`)** — `/assets/fonts/MinecraftRegular-Bmg3.otf`.
   Used for primary page titles (`h1`, `h2`) and header navigation in `default` mode, and globally in `mojangles` mode. Always disable smoothing to keep pixel edges sharp:
   ```css
   font-family: 'Minecraft', monospace !important;
   -webkit-font-smoothing: none !important;
   -moz-osx-font-smoothing: unset !important;
   font-smooth: never !important;
   text-rendering: geometricPrecision !important;
   ```
2. **Inter (`'Inter', sans-serif`)** — `/assets/fonts/inter/Inter-VariableFont_slnt,wght.woff2` (300–900).
   Body copy, subheadings (`h3`–`h6`), controls, buttons, inputs, tables, search, popovers, and cards.
3. **Noto Serif (`'Noto Serif', Georgia, serif`)** — `/assets/fonts/noto-serif/`.
   Long-form reading typography for `data-font="serif"`.
4. **Cardo (`'Cardo', Georgia, serif`)** — `/assets/fonts/cardo/`.
   Used wherever `.has-heading-font-family` is explicitly set.

*(UI icon fonts such as Font Awesome `i[class*="fa-"]` and monospace `<code>`/`<pre>` blocks retain their own font stacks regardless of `data-font`.)*

### B. Spacing Scale, Layout Containers & Corner Radius
- Spacing tokens: `--wp--preset--spacing--10` (`1rem`), `--20` (`min(1.5rem, 2vw)`), `--30` (`min(2.5rem, 3vw)`), `--40` (`min(4rem, 5vw)`), `--50` (`min(6.5rem, 8vw)`).
- Editorial width classes: `.is-layout-constrained` (~`620px`), `.alignwide` (~`1280px`), `.alignfull` (`100vw`).
- Chrome alignment container: `.site-header-row` and `.site-footer-row` share `max-width: 1440px` and `1.25rem` horizontal padding. Desktop site logo width is `180px` (`height: 38px` proportional to SVG viewBox); mobile `<= 600px` scales down to `155px`.
- Sticky header: `.site-header-group` (`10px` vertical padding, `backdrop-filter: blur(12px)`, `.is-scrolled` bottom border), exposing `--site-header-height: 59px` desktop / `56px` mobile (`<= 600px`). Desktop header navigation (`.site-header-nav`) is centered within `.site-header-row` whenever `>= 24px` clearance exists on both sides between `.site-header-left-group` and `.site-header-actions`, snapping right alongside `.site-header-actions` via `.is-nav-tight` when space tightens above `600px`.
- Sticky footer layout: `main`, `.wp-site-blocks > main` sets `min-height: calc(100vh - 83px)`.
- **Default Popover Inset (`--popover-inset: 14px`)** — Shared horizontal/vertical inset and divider spacing applied across floating popovers (`.site-personalize-dialog`, `.site-account-dialog`), mobile outer clamp (`calc(100vw - 2 * var(--popover-inset))`), and Search modal (`.site-search-modal`, `.site-search-fallback-form`, `.pagefind-ui__search-input` margin, `.pagefind-ui__drawer` side/bottom padding, `.site-search-footer` horizontal padding).
- **Corner Radius Scale** (declared on `:root` in [`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css)):
  - **Default (`--radius-default: 8px`)** — Shared baseline derived from sitewide image framing (`.wp-block-image img`, `.wiki-cover-banner`, `.wiki-article-body img`) and applied uniformly to buttons (`.pt-btn`, `.pt-tab-btn`, `.error-404-btn`, `.pagefind-ui__button`, `.site-account-btn-action`, `.site-account-link-item`, `.pt-stage-icon-btn`, `.wiki-mobile-toc-toggle`, `.skip-link`, `:focus-visible` rings), form controls (`.pt-input`, `.pt-dropdown-trigger`, `.pt-stepper`), content/post cards (`.post-entry-card`, `.wiki-pager-card`, `.pt-card`, `.pt-gallery-card`, `.wiki-hint`, `.wiki-tabs`), and compact modal/dropdown option tiles (`.home-wiki-button` and `.pt-btn-sharp` intentionally retain `0px` sharp corners to match `--wp--preset--shadow--sharp`).
  - **Popovers & Floating Overlays (`--radius-popover: 12px`)** — Slightly rounder container radius used for floating header popovers (`.site-personalize-dialog`, `.site-account-dialog`), overlay dialogs (`.site-search-dialog`), the floating lightbox command bar (`.site-lightbox-bar`), custom dropdown menus (`.pt-dropdown-menu`), `.pt-tablist`, `.wiki-sidebar-card`, and off-screen wiki drawers.
  - **Specialized / Micro Radii**: Inline `<kbd>`, `<code>`, `<mark>`, badges/chips (`4px`–`6px`), and circular swatches/badges (`50%` / `999px`).

---

## 3. Common Elements & Standard Parameters

### A. Standalone Buttons & Quick Links (`40px` Standard)
All individual labeled buttons and account quick links share a **`40px`** standard height so controls align cleanly across the site regardless of active `data-font`:

| Control | Selector(s) | Height / Box | Padding | Typography | Surface & Border | Hover State |
|---|---|---|---|---|---|---|
| **Neutral Standalone Button** | `.error-404-btn`, `#site-search-container .pagefind-ui__button`, `.pt-btn` | `min-height: 40px`, `box-sizing: border-box` | `0.45rem 1rem` | `Inter`, `0.9rem`, `font-weight: 400`, `line-height: 1.2` | `base-2` fill, `1px solid accent`, `border-radius: 8px`, `contrast` text | Border & text shift to `--brand-accent` (`.pagefind-ui__button` renders shadowless; others use subtle shadow) |
| **Primary CTA Button** | `.pt-btn-primary`, `.site-account-btn-primary` | `min-height: 40px` | `0.45rem 1rem` (`0.45rem 0.9rem` in popover) | `0.9rem`, `font-weight: 400`, `line-height: 1.2` | `--brand-accent` fill & `1px` border, `8px` radius, `--brand-accent-contrast` text | `--brand-accent-hover` fill & border |
| **Sign Out Button** | `.site-account-signout-btn` (with `.site-account-btn-action`) | `min-height: 40px`, `width: 100%` | `0.45rem 0.9rem` | `0.9rem`, `font-weight: 400`, `line-height: 1.2` | `base-2` fill, `1px solid accent`, `8px` radius | Border & text shift to `--brand-accent` |
| **Account Quick Links** | `.site-account-link-item` | `min-height: 40px`, `box-sizing: border-box` | `0.45rem 0.65rem` | `0.9rem`, `font-weight: 400`, `line-height: 1.2` | Transparent fill & `1px transparent` border, `8px` radius; left `16×16` `.site-account-link-icon` + label in `.site-account-link-main` (`gap: 0.55rem`) | `--brand-accent-muted` fill, `--brand-accent` text |
| **Workspace Tabs** | `.pt-tab-btn` | `min-height: 40px` | `0.45rem 1rem` | `0.92rem`, `400` (`500` active), `line-height: 1.2` | `transparent` inside `.pt-tablist` (`12px` radius, `0.3rem` padding); `8px` tab radius | `--brand-accent-muted` hover; `--brand-accent` fill + `--brand-accent-contrast` text when `.is-active` |
| **Danger Buttons** | `.pt-btn-danger-outline`, `.pt-btn-danger` | Matches `.pt-btn` / `.pt-btn-xs` | Matches `.pt-btn` / `.pt-btn-xs` | `font-weight: 400` | `#b91c1c` text (light) / `#f87171` (dark) for outline; `#dc2626` solid white-text fill | `#dc2626` / `#b91c1c` |
| **Sharp Block CTAs** | `.home-wiki-button`, `.pt-btn-sharp` (`#pt-publish-btn`) | `min-height: 40px !important` | `0.45rem 1.1rem` | `0.9rem` (`1.05rem` on home), `font-weight: 400`, `line-height: 1.2` | Solid fill (base white on home gradient, `--brand-accent` on Publish card), zero border, `0px` sharp corners, `6px 6px 0` sharp shadow (`0.2` light / `0.6` dark) | `--brand-accent` text on white (home) / `--brand-accent-hover` fill (Studio) |

**Intentional Exceptions (Non-40px Controls)**:
- **Compact card & inline controls (`.pt-btn-xs`)**: `min-height: 30px`, `padding: 0.25rem 0.55rem`, `0.78rem` text, `8px` radius (used for `Reset crop` and `Edit`/`Delete`/`Save`/`Cancel` inside dense `245px` gallery cards).
- **Stage overlay icon buttons (`.pt-stage-icon-btn`)**: `30px × 30px`, `8px` radius (Download PNG & Trash icons on Studio cards).
- **Header utility triggers (`.site-personalize-btn`, `.site-search-btn`, `.site-account-btn`, `.site-mobile-nav-close`, `.wiki-mobile-sidebar-toggle`)**: `24px × 24px` hit target, borderless transparent background, `20×20` (`24×24` close/sidebar) SVG icons.
- **Wiki TOC mobile toggle (`.wiki-mobile-toc-toggle`)**: `34px × 34px`, `8px` radius, `1px solid accent`.
- **Wiki sidebar nav rows**: Excluded from the `40px` button rule to preserve compact multi-level tree density (`0.42rem 0.65rem` top-level items, `0.36rem 0.65rem` nested links).
- **Multi-line navigation & post cards (`.wiki-pager-card`, `.wiki-content-ref-link`, `.post-entry-card`)**: `.wiki-pager-card` and `.wiki-content-ref-link` use `base-2` surface, `8px` radius, `1rem 1.25rem` padding with auto height; `.post-entry-card` uses a clear (`transparent`) background, `1px solid var(--wp--preset--color--contrast-3)` outline, `8px` radius, normal-weight title with a full-card stretched post link (`z-index: 1`), and individually clickable author/category links (`z-index: 2`). Both Wiki (`wiki/single.html`, `list.html`) and Posts (`posts/single.html` via `.post-pager-wrap`) enforce identical pager spacing (`3.5rem` desktop / `2.5rem` mobile `<= 820px` top margin above divider, and `2rem` total bottom clearance before `<footer>`).

### B. Inputs, Selects & Steppers
- **Universal Focus Rule** ([`static/css/custom.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/custom.css)): Text `<input>` and `<textarea>` controls remove outer focus outlines (`outline: none !important`) and highlight solely via `border-color: var(--brand-accent) !important`. Non-focus clicks keep outlines suppressed (`:focus:not(:focus-visible)`).
- **Studio Form Fields & Custom Dropdowns (`.pt-input`, `.pt-dropdown`)**:
  - Height: `38px`, `8px` radius (`--radius-default`), `background: var(--wp--preset--color--base)`, `1px solid var(--wp--preset--color--accent)`, `0.9rem` font size.
  - `.pt-input`: `padding: 0.45rem 0.75rem`. Compact inline variant (`.pt-input-compact`): `34px` height, `0.84rem`.
  - `.pt-dropdown`: Site-themed ARIA `listbox` replacement (zero browser-native `<select>` popups) rendered for Detail Scale, Canvas Scaling, and Gallery Size Filter. Trigger button aligns label left (`0.75rem`) and `16×16` chevron SVG right; border highlights to `--brand-accent` whenever `.is-open` (plus keyboard `:focus-visible`) and clears cleanly upon closing. Floating `.pt-dropdown-menu` uses `base-2` surface, `12px` popover radius, `6px` padding, `8px` option tiles, and `--brand-accent-muted` / `--brand-accent` selected/active states.
- **Increment Steppers (`.pt-stepper`)**:
  - `38px` height, `8px` radius (`30px 1fr 30px` CSS Grid for `-`, integer `.pt-stepper-val`, `+`), paired in a 2-row stack (`8px` gap) beside the `104px × 104px` square painting grid picker (`38 + 8 + 20 + 38 = 104px` total alignment height).
- **Search Modal Input (`.pagefind-ui__search-input`, `.site-search-fallback-input`)**:
  - `48px` height, `1.5px solid accent` border, `8px` radius, `20×20` magnifying glass icon at `left: calc(14px + 0.85rem)` and `26×26` clear `✕` button `0.75rem` inside the `14px` outer inset.

### C. Floating Header Popovers & Overlays
1. **Popover Card Pattern (`.site-personalize-dialog`, `.site-account-dialog`)**:
   - Anchored beneath the triggering header icon on desktop; fixed centered below the sticky header (`top: calc(var(--site-header-height, 56px) + 10px)`) at `<= 600px`.
   - `14px` default padding & divider rhythm (`--popover-inset`), `12px` radius (`--radius-popover`), `1px solid accent`, `base-2` surface, `box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14)` (`0 18px 48px rgba(0, 0, 0, 0.55)` dark).
   - **Personalize Popover** (`width: min(360px, calc(100vw - 28px))`): 3 theme circles (`34px` dia.), `6 × 2` accent swatch grid (`32px` dia.), 4 font `Ag` tiles (`8px` radius).
   - **Account Popover** (`width: min(320px, calc(100vw - 28px))`):
     - *Signed-out*: Explanatory note (`is-compact`) + full-width `40px` primary `Sign in` CTA (no redundant header).
     - *Signed-in*: `38px` circular `.site-account-avatar` + display name + optional `.site-account-admin-badge` (hidden unless admin) + lowercase email, divider, `40px` quick links (`Paintings Studio` with `16×16` image icon; `Manage Account` with `16×16` Microsoft 4-square logo and `↗`), divider, full-width `40px` `Sign out` button.
2. **Search Modal (`#site-search-modal`, [`layouts/partials/search_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/search_modal.html))**:
   - Bounded by `height: 100dvh; max-height: 100dvh;` with `env(safe-area-inset-bottom)` padding so mobile browser bars never overlap results. Centered `min(680px, 100%)` card, `12px` radius (`--radius-popover`), `14px` internal margin/padding inset (`--popover-inset`), `max-height: min(82dvh, 100%)`, frosted `12px` backdrop (`--backdrop-scrim`), scrollable `.pagefind-ui__drawer`, keyboard-navigation footer (`↵` / `↑↓` / `ESC`, hidden at `<= 600px`).
3. **Universal Lightbox (`#site-lightbox`, [`layouts/partials/lightbox_modal.html`](file:///Users/cherryquartzio/Repos/college-debt.github.io/layouts/partials/lightbox_modal.html))**:
   - Shared frosted backdrop (`backdrop-filter: blur(12px)`) over `rgba(240, 239, 237, 0.75)` / `--backdrop-scrim`.
   - Borderless `40×40` top-right close button (`✕`) and centered bottom floating command bar (`.site-lightbox-bar`, `12px` popover radius) with left/right library arrows (`32×32`) and zoom `-` / `%` / `+` (`32px` height), zero borders on inner controls.
   - Stage `.site-lightbox-stage` (`padding: 20px 20px 84px`) and `lightbox.js:updateLayout()` dynamically reserve bottom clearance above `.site-lightbox-bar` (`window.innerHeight - barRect.top + 20`) and subtract computed stage padding so the image centers in the visible canvas above the bar without overlap. Supports drag-to-pan and `image-rendering: pixelated` on pixel-art images.

---

## 4. Section-Specific Components

### A. Wiki Layout & Shortcodes ([`static/css/wiki.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/wiki.css))
- **3-Column Grid**: `270px` left sidebar card (`base-2`, `12px` popover radius), flexible center article, `230px` sticky right TOC rail (`scrollbar-gutter: stable` on both rails).
- **Responsive Drawers**: `<= 820px` moves left sidebar to offscreen slide drawer (`0 12px 12px 0` radius) toggled by top-left split-panel icon; `<= 1100px` moves TOC to offscreen right drawer (`12px 0 0 12px` radius) toggled by breadcrumb button when 2+ headings exist.
- **Shortcodes**:
  - `hint`: `8px` radius, `base-2` surface, `1px` border + `4px` left border (`--brand-accent` info, `#fcb900` warning, `#cf2e2e` danger, `#00d084` tip) and `.sr-only` severity prefix.
  - `tabs` / `tab`: `base-2` container, `1px solid accent` border, `8px` radius, horizontal tab header strip (`#faf9f7` light), active tab underlined (`2px solid var(--brand-accent)`).
  - `stepper` / `step`: `26×26px` circular numbered badges in `--brand-accent`.
  - `content-ref`: `wiki-pager-card`-style card (`base-2`, `1px solid accent`, `8px` radius) with leading icon and trailing `↗`/`→` cue.
  - `embed`: Responsive `16:9` container, `8px` radius, fallback external card.

### B. Paintings Studio (`/paintings/`, [`static/css/paintings.css`](file:///Users/cherryquartzio/Repos/college-debt.github.io/static/css/paintings.css))
- **Studio Cards (`.pt-card`)**: 2-column grid (1-col at `<= 860px`), `base-2` surface, `1px solid accent`, `8px` radius, `1.1rem` padding.
- **Preview Stage (`.pt-preview-stage`)**: `248px` height pixelated checkerboard canvas, `8px` radius, `30×30` download & trash icon buttons top-right, `.pt-chip` dimension badges bottom row.
- **Size & Frame Controls**: Left half holds `38px` Width/Height steppers + `104×104` grid picker (`8px` radius); right half holds `38px` Detail Scale & Canvas Scaling `<select>` dropdowns; below sits wrapped `32×32` Minecraft wood frame swatches (`8px` radius, plus Charcoal and Frameless).
- **Gallery Cards (`.pt-gallery-card`)**: Auto-fill `minmax(245px, 1fr)` grid with `1:1` pixelated thumbnail button (`cursor: zoom-in` into `#site-lightbox`), `font-weight: 400` size badge, and compact `30px` inline edit/delete controls.

### C. Status Page Parity (`status.collegedebt.app`)
Custom CSS injected into Uptime Kuma loads `Minecraft` and `Inter` from `https://collegedebt.app/assets/fonts/`, applies the same light/Onyx dark surfaces (`#f0efed`/`#131416`), flush description margins, and instant (no-transition) group collapse toggles.
