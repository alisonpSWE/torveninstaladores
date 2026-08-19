---
target: materials/estoque in /obra
total_score: 17
p0_count: 1
p1_count: 2
timestamp: 2026-08-19T19-17-43Z
slug: src-components-obras-obra-materiais-tab
---
Method: dual-agent (A: 5b90afb2-0e1c-4baf-b041-4af55b589acd · B: db08d054-ad57-440b-a274-7adc38038bdc)

#### Design Health Score

| # | Heuristic | Score | Key Observation |
|---|-----------|:-----:|-----------------|
| 1 | Visibility of System Status | 2/4 | Basic offline banner present, but sequential launches lack per-item progress tracking |
| 2 | Match System / Real World | 2/4 | Generic catalog shopping cart rather than solar installation BOM / Kit de Obra workflow |
| 3 | User Control and Freedom | 1/4 | **Critical Defect (P0)**: Switching tabs in Obra details instantly wipes all staged quantities |
| 4 | Consistency and Standards | 2/4 | Native `confirm()` / `alert()` popups; sub-44px stepper buttons violating `DESIGN.md` |
| 5 | Error Prevention | 1/4 | No validation when quantity exceeds warehouse stock; sequential async loop partial failure risk |
| 6 | Recognition Rather Than Recall | 1/4 | Forces installer to remember inverter/module specs from parent tab without job kit context |
| 7 | Flexibility and Efficiency | 2/4 | Search works, but stepping large cable lengths (+5m) requires excessive repeated tapping |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean black OLED / `#ffc61e` palette, but cluttered by stepper controls on all inactive cards |
| 9 | Error Recovery | 2/4 | Generic alert on mutation failure without line-item recovery or partial rollback clarity |
| 10 | Help and Documentation | 1/4 | Missing inline tooltips on stock balance rules and offline sync mechanisms |
| **Total** | | **17/40** | **Poor (Needs Overhaul)** |

#### Anti-Patterns Verdict
- **LLM Assessment**: Moderate AI slop and desktop tropes inside a mobile field container. Uses an uncurated flat catalog wall with sub-32px touch targets and thread-freezing `window.confirm()` popups.
- **Deterministic Scan**: 7 findings (`detect.mjs`) in `obra-materiais-tab.tsx` due to arbitrary `text-[10px]` / `text-[11px]` classes; 4 blocking native `alert()` / `confirm()` calls identified.
- **Visual Overlays**: Clean, but touch areas fail physical usability standards for gloved technicians on rooftops.

#### Overall Impression
While the underlying offline IndexedDB architecture and Torven visual skin are solid, the material consumption workflow in `/obra` is hampered by data volatility, tiny 32px stepper buttons, and a lack of project BOM integration.

#### What's Working
1. **Offline IndexedDB Store (`idb-keyval`)**: Materials launched without internet connectivity are securely preserved locally with pending indicators.
2. **High-Vis Solar Rig Palette**: 14:1 AAA contrast on Solar Yellow (`#ffc61e`) with black OLED canvas meets outdoor legibility requirements.
3. **Historical Consumption Log**: Granular list showing quantity, technician attribution, and date per Obra.

#### Priority Issues
- **[P0] Volatile Staging & Silent Data Loss on Tab Switch**
  - **What**: Switching from "Materiais / Estoque" to "Fotos da Obra" unmounts `<ObraMateriaisTab />`, clearing all selected `quantities` and `observacao`.
  - **Why**: Installers frequently toggle tabs to check panel/inverter photos before launching; losing inputs causes immense site frustration.
  - **Fix**: Elevate state to `ObraDetailPage` / persistent draft or keep tab components mounted with CSS `hidden`.
  - **Suggested command**: `/impeccable harden src/components/obras/obra-detail-page.tsx`

- **[P1] Sub-32px Stepper Buttons & Inefficient Input Ergonomics**
  - **What**: Stepper minus/plus buttons are hardcoded to `w-8 h-8` (32px), and cable increments (+5m) require 15-20 taps for standard runs.
  - **Why**: Rooftop installers with gloves and glare suffer high mis-tap rates.
  - **Fix**: Enlarge touch targets to $\ge 44\text{px}$, add `inputMode="decimal"`, and add quick multiplier chips (`+10m`, `+25m`, `+50m`).
  - **Suggested command**: `/impeccable adapt src/components/obras/obra-materiais-tab.tsx`

- **[P1] Unbounded Stock Consumption & Sequential Mutation Vulnerability**
  - **What**: UI allows launching quantities greater than available warehouse balance with no warning; sequential `for ... of await` mutations leave partial state on connection drops.
  - **Why**: Corrupts central Kardex balance with negative numbers and creates duplicate entries on retry.
  - **Fix**: Add amber warnings when consumption exceeds balance, and provide atomic/batch transaction feedback.
  - **Suggested command**: `/impeccable harden src/components/obras/obra-materiais-tab.tsx`

- **[P2] Lack of Project Kit / BOM Integration**
  - **What**: Does not leverage the technical project specs (kWp, modules, inverter model) already present in the Obra record.
  - **Why**: Forces technicians to search and remember equipment specs manually.
  - **Fix**: Add a **"⚡ Kit Previsto da Obra"** top card pre-filled with planned equipment for 1-tap confirmation.
  - **Suggested command**: `/impeccable craft kit-previsto-obra`

- **[P3] Desktop `confirm()` & `alert()` Dialogs**
  - **What**: Material reversal (estorno) and CRM errors call native browser popups.
  - **Why**: Freezes webview threads and breaks mobile dark mode immersion.
  - **Fix**: Replace with standard Radix `Dialog` modals and in-app toasts with Undo actions.
  - **Suggested command**: `/impeccable clarify src/components/obras/obra-materiais-tab.tsx`
