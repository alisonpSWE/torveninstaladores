---
target: /estoque
total_score: 33
p0_count: 0
p1_count: 1
timestamp: 2026-08-19T18-40-18Z
slug: src-app-estoque
---
Method: dual-agent (A: 493d51ad-0c79-40d6-b938-369fd539db29 · B: 5705313c-c6a1-49c9-9b00-7de8e59aa121)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3/4 | Quick delta +/- lack optimistic loading; catalog query errors fail silently to empty state |
| 2 | Match System / Real World | 4/4 | Kardex ledger, physical warehouse addressing, Brazilian units, WhatsApp purchase export |
| 3 | User Control and Freedom | 3/4 | Esc key clears search/selection; missing Undo for inline +/- adjustments; no SKU archive/delete |
| 4 | Consistency and Standards | 4/4 | Exact compliance with `#ffc61e` Solar Yellow on OLED black, shadcn dialogs, monospace metrics |
| 5 | Error Prevention | 3/4 | Required justification on manual adjustments; inline +/- buttons lack debounce/touch safeguards |
| 6 | Recognition Rather Than Recall | 4/4 | Status badges (Crítico/Baixo/Normal), monospace SKU tags, `/` shortcut hint, modal context |
| 7 | Flexibility and Efficiency | 3/4 | `/` search shortcut, `Esc` clear, bulk category change, CSV batch upsert, table vs card toggle |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean industrial dark theme; unmotivated `animate-pulse` on KPI; 4 action buttons in table row |
| 9 | Error Recovery | 2/4 | CSV modal has row-by-row error list; quick adjust catches with browser `alert()`; catalog query error is silent |
| 10 | Help and Documentation | 3/4 | CSV mapping cheatsheet, clear placeholders; no tooltips explaining Kardex or status thresholds |
| **Total** | | **33/40** | **Very Good (High-B Grade)** |

#### Anti-Patterns Verdict

- **LLM Assessment**: High-craft enterprise WMS tooling tailored to Brazilian solar installation operations. Visual tone strictly follows the "High-Vis Solar Rig" system (OLED black base, `#ffc61e` Solar Yellow accents, 14:1 AAA contrast). 3 AI implementation tells noted: native `alert()` fallback on quick adjustments, cosmetic `animate-pulse` on KPI icon, and hardcoded static category select options in modals.
- **Deterministic Scan**: `0 anti-patterns found across 8 files` (`detect.mjs`). Zero slop rules triggered (no gradient text, no side-stripe borders, no nested cards, no bouncy motion, no low-contrast gray-on-color).
- **Visual Overlays**: Deterministic scan clean; no overlay errors flagged.

#### Overall Impression
A remarkably robust, task-focused WMS interface with genuine operational depth (Kardex ledger, Brazilian CSV parsing, deficit-based purchase requisitions). The single biggest opportunity is hardening the quick-adjustment flow with proper audit logging, replacing native `alert()` with toasts, and eliminating touch-target friction on mobile.

#### What's Working
1. **Best-in-Class CSV Batch Onboarding (`import-csv-modal.tsx` & `csv-parser.ts`)**: Auto-detects delimiters (`;`, `,`, `\t`), handles Brazilian decimal formatting, provides interactive row-by-row validation feedback, and includes a balance preservation safety switch.
2. **Industrial Palette & Contrast Fidelity (`DESIGN.md`)**: Strict adherence to `#000000` canvas with `#ffc61e` primary CTAs paired with `#000000` text for 14:1 AAA contrast, with clear monospace SKU tags.
3. **Traceable Kardex Ledger (`kardex-modal.tsx`)**: Links warehouse material movements directly to installation projects (`obra_materiais`), showing client, city, and installer context.

#### Priority Issues

- **[P1] Fragile Quick Delta Adjustment with Native `alert()` & Zero Audit Trail**
  - **Why it matters**: In a WMS, untracked inventory adjustments cause shrinkage ("furo de estoque"). If a technician accidentally taps `+` or `-` on mobile, stock is mutated with zero justification in the Kardex log and errors trigger a blocking browser `alert()`.
  - **Fix**: Replace `alert()` with an in-app Toast notification; add an optimistic 4-second Undo toast; log quick adjustments to the audit ledger with an automated tag (`"Ajuste Rápido via Painel"`); expand touch target to ≥44px.
  - **Suggested command**: `/impeccable polish src/components/estoque/estoque-data-table.tsx`

- **[P2] Sub-44px Touch Targets on Operational Table & Mobile View**
  - **Why it matters**: Table quick delta buttons (`w-6 h-6`, 24px), row action icons (`p-1.5`, 28px), and category filter pills (`min-h-[32px]`) violate WCAG 2.5.5 and Torven field standards (≥48px), causing misclicks in sunlight or with work gloves.
  - **Fix**: Apply minimum 44px hitboxes via padding/pseudo-elements or increased button bounds; scale category pills to `min-h-[44px]`.
  - **Suggested command**: `/impeccable audit src/components/estoque/estoque-data-table.tsx`

- **[P3] Silent Failure on Catalog Query Error (False "Zero Stock" Panic)**
  - **Why it matters**: If `useEstoqueProdutos()` encounters a network or database failure, the dashboard falls through to the empty state "Nenhum material encontrado", causing panic that inventory was erased.
  - **Fix**: Add explicit `isError` handling rendering an error card with error details and a "Tentar Novamente" (Retry) button.
  - **Suggested command**: `/impeccable harden src/components/estoque/estoque-admin-dashboard.tsx`

- **[P4] Hardcoded Category Select Options vs. Dynamic Database Categories**
  - **Why it matters**: `estoque-admin-dashboard.tsx` and `bulk-categoria-modal.tsx` hardcode 6 static categories (`Fixação`, `Cabos`, etc.), ignoring dynamic categories present in the database or imported via CSV.
  - **Fix**: Pass the dynamic `categories` array to modal select dropdowns with an option to create a new category.
  - **Suggested command**: `/impeccable polish src/components/estoque/bulk-categoria-modal.tsx`

#### Persona Red Flags
- **Alex (Power User / Almoxarife)**: Missing keyboard row navigation (Arrow keys + Space to select) and tabular numbers (`tabular-nums`), causing visual jitter during rapid stock adjustments. Cannot export full catalog without first selecting all items.
- **Jordan (First-Timer / Warehouse Assistant)**: Unclear what "Kardex" means without a tooltip; hesitant to click inline `+`/`-` because there is no feedback explaining that it immediately updates central database stock.
- **Casey (Mobile Field Installer / Supervisor on-site)**: 24px quick buttons are too small for thumb navigation outdoors; floating bulk action bar can overlap bottom table row if scrolling is tight.

#### Minor Observations
- Add `tabular-nums font-mono` to stock counts and minimums to avoid horizontal number jitter.
- Remove decorative `animate-pulse` from the "Estoque Crítico" KPI icon.
- Provide parity in `EstoqueGridView` for quick adjustments or streamline into a 1-tap sheet.

#### Questions to Consider
- Should inline `+`/`-` buttons prompt for a 1-tap quick reason (e.g., "Avaria", "Sobra de Obra", "Ajuste Físico") to keep the Kardex audit 100% complete?
- Should the WMS offer a 1-click "Gerar Pedido de Compra dos Críticos" button on the KPI card without requiring manual item selection?
