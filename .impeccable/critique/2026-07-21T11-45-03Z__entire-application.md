---
target: entire application
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-07-21T11-45-03Z
slug: entire-application
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast notifications present, but background real-time sync status (Firebase) lacks visible connectivity indicator. |
| 2 | Match System / Real World | 3 | Uses industrial maintenance domain language (PM, Breakdown, CAPEX, VOSF) accurately. |
| 3 | User Control and Freedom | 2 | Import/Export actions lack dry-run validation previews or granular undo support. |
| 4 | Consistency and Standards | 2 | Mixed styling paradigms: inline CSS styles combined with Tailwind utilities and custom CSS classes in `index.css`. |
| 5 | Error Prevention | 2 | Deletions and status transitions rely on standard confirm modals, but form inputs lack real-time constraint validation. |
| 6 | Recognition Rather Than Recall | 3 | Navigation and icons are well labeled; table actions use clear button copy. |
| 7 | Flexibility and Efficiency of Use | 2 | Missing global keyboard shortcuts (e.g. search, add record) for power users. |
| 8 | Aesthetic and Minimalist Design | 2 | Heavy reliance on 4px/5px side-stripe borders (`border-left: 4px solid ...`) creating visual clutter and AI-slop anti-pattern. |
| 9 | Error Recovery | 2 | Error toasts display message, but form errors don't highlight invalid fields contextually. |
| 10 | Help and Documentation | 2 | No inline tooltips or contextual field help for complex industrial forms. |
| **Total** | | **23/40** | **Acceptable (Significant improvements needed)** |

#### Anti-Patterns Verdict

**Start here.** Does this look AI-generated?

**LLM assessment**: Yes, in specific visual details. While the information architecture and industrial domain models are strong, the component styling heavily uses side-stripe borders (`border-left: 4px/5px solid ...`) on cards, alert banners, and list items. This ghost-card side-tab pattern is one of the most recognizable AI design tells. Additionally, styling is fragmented between inline JavaScript objects and CSS variables.

**Deterministic scan**: The automated detector scanned `src/` and identified **18 anti-pattern instances**:
- **17 Side-tab accent borders**:
  - `src/index.css` (Lines 177, 191, 205, 219, 854, 857, 860, 1135, 1138, 1141)
  - `src/pages/document/Audit.jsx` (Line 361)
  - `src/pages/Home.jsx` (Line 393)
  - `src/pages/maintenance/Purchasing.jsx` (Lines 1360, 1398)
  - `src/pages/project/ProjectPlanning.jsx` (Lines 460, 471, 482)
- **1 Layout property animation**:
  - `src/pages/document/Audit.jsx` (Line 407: `transition: width`)

**Visual overlays**: N/A (CLI static scan performed).

#### Overall Impression
MACE is a feature-rich, well-structured industrial management dashboard. The core functional flow (PM schedules, breakdown logging, project requests) is well aligned with user needs. However, the visual presentation suffers from AI design tells (thick side borders), inconsistent styling implementations (inline styles vs CSS classes), and a lack of keyboard accelerators for high-frequency operations.

#### What's Working
1. **Domain-Specific Information Architecture**: Navigation logically separates maintenance, project engineering, documents, and shop floor feedback.
2. **Clear Typography Foundations**: Using `Hanken Grotesk` for UI and `JetBrains Mono` for serial IDs, dates, and status tags provides great contrast.
3. **Responsive Table Structures**: Tables adapt cleanly across modules with dedicated search and filter bars.

#### Priority Issues

- **[P1] Visual Anti-Pattern: Side-Stripe Accent Borders**
  - *Why it matters*: 17 places across `index.css`, `Home.jsx`, `Audit.jsx`, `Purchasing.jsx`, and `ProjectPlanning.jsx` use `border-left: 4px/5px solid [color]`. This creates a dated "AI-generated template" appearance.
  - *Fix*: Replace side-stripe borders with full subtle borders (`border: 1px solid var(--border)`), background surface tints, or structured status pill badges.
  - *Suggested command*: `$impeccable quieter`

- **[P1] Inconsistent Styling Paradigm & Inline Style Leaks**
  - *Why it matters*: Many components mix React inline styles (`style={{ borderLeft: ..., background: ... }}`) directly with Tailwind classes and CSS variables in `index.css`. This makes theming and dark mode refactoring fragile.
  - *Fix*: Consolidate inline card styles into utility CSS tokens and dedicated class names in `index.css`.
  - *Suggested command*: `$impeccable extract`

- **[P2] Layout Thrash in Progress Bars & Drawers**
  - *Why it matters*: `Audit.jsx` animates `transition: width`, causing browser reflow on frame updates during state changes.
  - *Fix*: Replace `transition: width` with hardware-accelerated `transform: scaleX(...)` or Framer Motion transform transitions.
  - *Suggested command*: `$impeccable optimize`

- **[P2] Missing Keyboard Shortcuts for Power Users**
  - *Why it matters*: Plant engineers and technicians repeatedly filter tables and enter logs, but must use mouse clicks for every operation.
  - *Fix*: Add global key bindings (`Ctrl+K` or `/` for search, `N` for new record entry, `Esc` to close draw/modal).
  - *Suggested command*: `$impeccable adapt`

- **[P3] Lack of Contextual Form Guidance & Dry-Run Preview**
  - *Why it matters*: Complex record creation (e.g. Trouble Analysis CSV imports or PM Plan creation) executes immediately without dry-run validation feedback.
  - *Fix*: Add inline validation hints and import summary preview dialogs.
  - *Suggested command*: `$impeccable harden`

#### Persona Red Flags

**Alex (Power User)**:
- No keyboard shortcuts (`Ctrl+K`, `/`, `N`) for table search or quick creation.
- Table filtering requires multiple dropdown clicks without quick preset filters.
- High click friction for daily log entries.

**Jordan (First-Timer)**:
- High visual noise from side-border colors competing for attention on summary cards.
- Lack of inline tooltips explaining technical acronyms (VOSF, CAPEX).
- CSV import action offers no preview confirmation before database mutation.

**Sam (Accessibility-Dependent User)**:
- Focus rings are suppressed or inconsistent across custom card buttons.
- Status colors rely heavily on red/green hue contrast without high-contrast icons or badges.

#### Minor Observations
- Modal backdrops use custom opacity overlays instead of native `<dialog>` or standardized portal z-index tiers.
- Form inputs in dark mode containers don't consistently use tokenized `--border2` focus outlines.

#### Questions to Consider
- What if summary KPI cards used solid neutral surface containers with top badge indicators instead of left accent lines?
- How might introducing a command palette (`Ctrl+K`) transform how plant engineers navigate between machine trouble logs and PM schedules?
- Could CSV import flows display a mandatory validation diff modal before writing directly to Firestore collections?
