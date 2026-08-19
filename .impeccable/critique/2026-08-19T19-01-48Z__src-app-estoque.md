---
target: /estoque
total_score: 40
p0_count: 0
p1_count: 0
timestamp: 2026-08-19T19-01-48Z
slug: src-app-estoque
---
Method: dual-agent (A: 72d7530d-e316-408b-88d9-dcb296e0064b · B: 4d8c3819-a4e7-4fdb-854a-6d3ad0f10f26)

#### Design Health Score

| # | Heuristic | Score | Key Observation |
|---|-----------|:-----:|-----------------|
| 1 | Visibility of System Status | 4/4 | Real-time optimistic mutations, non-blocking toast confirmations with Undo, error boundaries |
| 2 | Match System / Real World | 4/4 | Kardex audit ledger, Brazilian CSV parsing, physical bin addressing, WhatsApp purchase formatting |
| 3 | User Control and Freedom | 4/4 | 1-click Undo on adjustments, global `Esc` and `/` shortcuts, modal dismissal safety |
| 4 | Consistency and Standards | 4/4 | Strict 14:1 AAA contrast with `#ffc61e` Solar Yellow on OLED black, shadcn dialog conventions |
| 5 | Error Prevention | 4/4 | 1-tap quick reason popover, zero-stock decrement blocking, CSV pre-flight validation table |
| 6 | Recognition Rather Than Recall | 4/4 | Status badges (Crítico/Baixo/Normal), monospace SKU tags, search shortcut badge, Kardex subtitles |
| 7 | Flexibility and Efficiency | 4/4 | 1-click "Gerar Pedido" on KPI card, 1-click catalog CSV export, Table vs Grid responsive modes |
| 8 | Aesthetic and Minimalist Design | 4/4 | High-density industrial dark UI, zero decorative noise, clean 1px structural zinc borders |
| 9 | Error Recovery | 4/4 | Dedicated query error card with retry button, in-app Undo toasts, line-by-line CSV error feedback |
| 10 | Help and Documentation | 4/4 | Descriptive Kardex ledger subtitles, CSV format cheatsheet, clear input placeholders |
| **Total** | | **40/40** | **Excellent (Ship it)** |

#### Anti-Patterns Verdict
- **LLM Assessment**: High-craft enterprise WMS workspace matching Linear/Raycast design standards. Zero generic AI tells, flawless adherence to the Torven "High-Vis Solar Rig" system.
- **Deterministic Scan**: 0 critical errors, 0 provider slop rules triggered. 2 hover false positives cleared, 52 advisory notifications regarding literal `text-[10px]` / `text-[11px]` micro-typography classes.
- **Visual Overlays**: Clean.

#### Overall Impression
The `/estoque` module is a field-hardened, production-ready WMS interface engineered for speed, high outdoors contrast, and audit integrity.

#### What's Working
1. **1-Tap Quick Adjust Stepper with Non-Blocking Undo**: Popover enables lightning-fast reason selection with instant optimistic updates and a 5-second undo toast.
2. **Auto-Calculated Critical Replenishment Drawer**: 1-click action directly on the KPI card that calculates stock deficits across all low-stock SKUs and prepares WhatsApp/CSV payloads.
3. **Resilient Brazilian CSV Parsing & Batch Updates**: Auto-detects delimiters (`;`, `,`, `\t`), handles comma decimals, and allows warehouse balance preservation.
4. **Physical Kardex Traceability**: Full chronological record connecting material consumption directly to installation projects (`obras`) and installers.

#### Priority Issues
- **[P3] Formalize Micro-Typography Tokens (Advisory)**
  - **What**: 52 instances of arbitrary `text-[10px]` / `text-[11px]` utility classes in table captions and badges.
  - **Fix**: Standardize to Tailwind's `text-xs` or formalize a `micro: 11px` scale token in `DESIGN.md`.
  - **Suggested command**: `/impeccable typeset src/components/estoque`

- **[P3] Toast Positioning on Mobile Viewports (<640px)**
  - **What**: When the floating bulk actions bar is active and a toast notification fires, they can overlap on small phone screens.
  - **Fix**: Offset the toast on mobile to `top-4 right-4` or raise its bottom anchor.
  - **Suggested command**: `/impeccable adapt src/components/estoque/estoque-admin-dashboard.tsx`
