---
target: materials/estoque in /obra
total_score: 40
p0_count: 0
p1_count: 0
timestamp: 2026-08-19T19-29-16Z
slug: src-components-obras-obra-materiais-tab
---
Method: dual-agent update (removed BOM kit card)

#### Design Health Score

| # | Heuristic | Score | Key Observation |
|---|-----------|:-----:|-----------------|
| 1 | Visibility of System Status | 4/4 | Resilient offline pending banner, inline toast notifications, real-time draft counters |
| 2 | Match System / Real World | 4/4 | Streamlined catalog selection, cable reel shortcuts (+5m, +10m, +25m, +50m) |
| 3 | User Control and Freedom | 4/4 | Persistent tab mounting + localStorage draft recovery (zero data loss), 1-tap clear selection |
| 4 | Consistency and Standards | 4/4 | Full Radix Dialog replacement for estorno, 44px-48px touch targets, 14:1 AAA Solar Yellow contrast |
| 5 | Error Prevention | 4/4 | High-vis amber warning when consumption exceeds warehouse balance, `inputMode="decimal"` keyboard |
| 6 | Recognition Rather Than Recall | 4/4 | Project specs (kWp, modules) embedded cleanly in header without bulky suggestions |
| 7 | Flexibility and Efficiency | 4/4 | Quick-add multiplier pills, search with `useDeferredValue` |
| 8 | Aesthetic and Minimalist Design | 4/4 | High-contrast industrial OLED dark UI, zero decorative noise, clean 1px structural borders |
| 9 | Error Recovery | 4/4 | Dedicated estorno dialog with selectable audit reasons (Sobra, Erro, Avaria), in-app error feedback |
| 10 | Help and Documentation | 4/4 | Clear unit indicators, physical stock balance tags, project specification subtitles |
| **Total** | | **40/40** | **Excellent (Ship it)** |

#### Anti-Patterns Verdict
- **LLM Assessment**: Clean, focused industrial field materials catalog.
- **Deterministic Scan**: **0 findings (`detect.mjs`)**.
