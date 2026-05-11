# Assets to Match Reference Supply Chain UI Exactly

Use this list to create or source SVG and image assets so the game matches the reference design pixel-for-pixel.

## Quick reference: what you need

| Category | Count | Location |
|----------|-------|----------|
| **Node icons** (Supplier, Factory, WH A/B, DC, Customer) | 5 SVGs | `src/assets/icons/` |
| **Top bar** (document, play, bar-chart, message, refresh) | 5 SVGs | `src/assets/icons/` |
| **Status** (warning triangle, green checkmark) | 2 SVGs | `src/assets/icons/` |
| **Advisor avatar** (stylized person for speech bubble) | 1 SVG or PNG | `src/assets/icons/` |
| **Optional** (single cargo box for moving items) | 1 SVG | `src/assets/icons/` |

**Total: 14 assets** (13 required + 1 optional). All can be SVG; advisor can be PNG if preferred.

---

## 1. Node icons (supply chain stages)

Used inside each node card. **Format: SVG** (24×24 or 32×32 viewBox). Prefer single-color (e.g. `currentColor`) so borders/labels can tint them.

| Asset path | Description | Notes |
|------------|-------------|--------|
| `src/assets/icons/icon-supplier.svg` | Cardboard box / package | Single box icon for Supplier. |
| `src/assets/icons/icon-factory.svg` | Factory building | Building with chimney or smokestack for Factory. |
| `src/assets/icons/icon-warehouse.svg` | Building with "24H" | Same icon for WH A and WH B; optional "24H" text in design. |
| `src/assets/icons/icon-dc.svg` | Multi-story building | Distribution center; 2–3 stories. |
| `src/assets/icons/icon-customer.svg` | Two people (stylized) | Single group/silhouette for Customer. |

---

## 2. Top bar & buttons

| Asset path | Description | Notes |
|------------|-------------|--------|
| `src/assets/icons/icon-document.svg` | Document / clipboard | Shown next to scenario title (e.g. "Bullwhip Basics – Section A"). |
| `src/assets/icons/icon-play.svg` | Play / right arrow | Orders button. Can use Lucide `Play` if style matches. |
| `src/assets/icons/icon-bar-chart.svg` | Bar chart | Analytics button. |
| `src/assets/icons/icon-message.svg` | Speech bubble or document | Reflection button. |
| `src/assets/icons/icon-refresh.svg` | Refresh / circular arrow | Reset button. |

---

## 3. Status & alerts

| Asset path | Description | Notes |
|------------|-------------|--------|
| `src/assets/icons/icon-warning.svg` | Yellow/amber triangle with exclamation | Shown above node when warning/critical (e.g. WH B). ~24×24. |
| `src/assets/icons/icon-check.svg` | Green checkmark | Shown at Customer when demand is "Met". |

---

## 4. Bottom panel (advisor)

| Asset path | Description | Notes |
|------------|-------------|--------|
| `src/assets/icons/icon-advisor.svg` | Stylized person (e.g. purple) | Small avatar in the “It’s your turn…” speech bubble. ~40×40. Can be illustration or simple silhouette. |

---

## 5. Flow / conveyor (optional)

| Asset path | Description | Notes |
|------------|-------------|--------|
| — | Teal/green flow line | Currently implemented as CSS (gradient + glow). For exact match: optional SVG `<line>` or `<path>` per segment, then animate orange boxes along path. |
| — | Moving cargo box | Currently a small rounded `<div>`. For exact match: `src/assets/icons/icon-cargo-box.svg` (orange rounded rectangle, ~20×16) and animate along path. |

---

## 6. Colors (CSS / design tokens)

Use these in your SVGs (e.g. `fill="currentColor"` and set color in CSS) or in Tailwind:

| Role | Hex (example) | Usage |
|------|----------------|--------|
| Background | `#0f172a`–`#1e1b4b` | Dark blue–purple gradient. |
| Card bg | `#1e293b` | Node cards, top bar cards. |
| Border (default) | `#475569` | Subtle borders. |
| Teal (flow, primary) | `#2dd4bf` / `#14b8a6` | Flow lines, healthy nodes, Orders button. |
| Orange (warning, cargo) | `#fb923c` / `#ea580c` | Warning state, moving boxes. |
| Pink/red (critical) | `#f472b6` / `#f43f5e` | Critical nodes, Customer border when issue. |
| Text primary | `#f8fafc` | Labels, cost. |
| Text muted | `#94a3b8` | "ROUND", "COST", "Inv". |

---

## 7. Suggested folder structure

```
src/
  assets/
    icons/
      icon-supplier.svg
      icon-factory.svg
      icon-warehouse.svg
      icon-dc.svg
      icon-customer.svg
      icon-document.svg
      icon-play.svg
      icon-bar-chart.svg
      icon-message.svg
      icon-refresh.svg
      icon-warning.svg
      icon-check.svg
      icon-advisor.svg
      icon-cargo-box.svg   # optional, for moving items
```

---

## 8. Using the assets in code

- **React:** Import SVGs as components (e.g. Vite’s `import Icon from './assets/icons/icon-supplier.svg?react'`) or as URL and use in `<img src={...} alt="" />`.
- **Node icons:** In `LandscapeSupplyChain.tsx`, replace the emoji `<span>{emoji}</span>` with `<img src={supplierIcon} alt="" className="w-8 h-8" />` or an inline SVG component.
- **Buttons:** Same approach in `StudentDashboard.tsx` for Orders, Analytics, Reflection, Reset if you switch from Lucide to custom icons.
- **Warning / check:** Replace Lucide `<AlertTriangle />` and `<CheckCircle />` with your `icon-warning.svg` and `icon-check.svg` when ready.

Once these assets are in place, the code can be wired to use them so the UI matches the reference exactly.
