# MACE - Design System Documentation

This document describes the visual style guide, styling conventions, CSS variables, and layout guidelines for the MACE application.

---

## 🎨 Color Palette & Themes

MACE uses CSS variables defined in [index.css](file:///d:/UserProfiles/Desktop/mace/src/index.css) to enforce a unified aesthetic. The color palette blends an industrial dashboard concept with clean modern workspace themes.

| Variable Name | Hex Code / Value | Visual Use Case |
| :--- | :--- | :--- |
| `--bg` | `#fcf8fa` | Main workspace light flat grayish-pink canvas. |
| `--surface` | `#ffffff` | Primary container blocks, cards, and modal sheets. |
| `--surface2` | `#f6f3f5` | Secondary panels and table/list headers. |
| `--surface3` | `#eae7e9` | Borders, input backgrounds, active hover states. |
| `--border` | `#e2e8f0` | Subtle outer layout separators. |
| `--border2` | `#cbd5e1` | Deep inner border lines (e.g., input frames). |
| `--accent` | `#0066ff` | Electric Blue for primary buttons, focus highlights, tabs. |
| `--green` | `#10b981` | Completed items, approvals, healthy KPI metrics. |
| `--yellow` | `#f59e0b` | Warnings, pending items, items awaiting review. |
| `--red` | `#ef4444` | Breakdown indicators, overdue plans, delete buttons. |
| `--text` | `#1b1b1d` | Dominant body text and headings. |
| `--text2` | `#45464d` | Sub-titles, form labels, secondary details. |
| `--text3` | `#76777d` | Placeholder values, disabled captions, metadata. |

---

## ✍️ Typography

- **Primary Sans Font**: `'Hanken Grotesk'` (fallback: `'Inter'`, system-ui).
  - Used for headings, cards, telemetry counters, lists, and forms.
- **Monospace Font**: `'JetBrains Mono'`.
  - Used for status codes, dates, serial tags, database IDs, and numerical calculations.

---

## 📐 Layout & Navigation Standard

- **Sidebar (Left-hand Nav)**:
  - Fixed-width (`250px`) dark sidebar utilizing `#141B2E` as its backdrop.
  - White-space scaling for lucide icons and section headings.
- **Main View Canvas**:
  - Right of the sidebar, fluid margin `margin-left: 250px`.
  - Content should be wrapped in standard layout components providing responsive gutters (`padding: 24px` to `32px`).

---

## 💎 Design Consistency Checklist

When designing new components or views:
1. **Forms**: Use standard floating labels or top-aligned labels with `border: 1px solid var(--border2)` inputs. Add transitions for focus state outlines (`outline: 2px solid var(--accent)`).
2. **Action Buttons**:
   - *Primary*: CSS class `btn-primary` (solid blue background using `var(--accent)`).
   - *Secondary*: CSS class `btn-secondary` (border outline using `var(--border2)` and light surface fill).
   - *Critical*: CSS class `btn-danger` (solid red background using `var(--red)`).
3. **Data Tables**:
   - Header row must use background `var(--surface2)`.
   - Zebra striping or grid lines using `var(--border)` for high readability.
   - Text alignment: Left-align descriptions and names; Center-align statuses/dates; Right-align numbers/actions.
4. **Status Badges**:
   - Use soft background colors with saturated text for status pills:
     - `Pending`: Light Amber backdrop with `var(--yellow)` text.
     - `Completed/Approved`: Light Green backdrop with `var(--green)` text.
     - `Failed/Breakdown`: Light Red backdrop with `var(--red)` text.
5. **Toast Notifications**: Always trigger notifications through the `ToastProvider` context API (`useToast()`) to display error/success banners consistently.

---

## 🧱 Extracted Component Library (`src/components/`)

- **`PageHeader`** ([PageHeader.jsx](file:///d:/UserProfiles/Desktop/mace/src/components/PageHeader.jsx)): Standardized page top block supporting `title`, `subtitle`, optional `badgeText`, and `actions` slot.
- **`EmptyState`** ([EmptyState.jsx](file:///d:/UserProfiles/Desktop/mace/src/components/EmptyState.jsx)): Accessible placeholder state supporting `icon`, `title`, `description`, and `action` slot.
- **`MetricCard`** ([MetricCard.jsx](file:///d:/UserProfiles/Desktop/mace/src/components/MetricCard.jsx)): KPI dashboard card supporting `label`, `value`, `subtext`, `icon`, `glowColor` (`blue` | `red` | `yellow` | `green`), and accessible `onClick` handling.
- **`Modal`** ([Modal.jsx](file:///d:/UserProfiles/Desktop/mace/src/components/Modal.jsx)): WCAG AA modal dialog supporting focus management, ARIA attributes, and `Escape` key dismiss.
- **`StatusBadge`** ([StatusBadge.jsx](file:///d:/UserProfiles/Desktop/mace/src/components/StatusBadge.jsx)): Uniform status pill component using design token colors.

