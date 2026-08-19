---
target: materials/estoque in /obra
total_score: 40
p0_count: 0
p1_count: 0
timestamp: 2026-08-19T19-22-34Z
slug: src-components-obras-obra-materiais-tab
---
Method: dual-agent post-polish pass

#### Design Health Score

| # | Heuristic | Score | Key Observation |
|---|-----------|:-----:|-----------------|
| 1 | Visibility of System Status | 4/4 | Resilient offline pending banner, inline toast notifications, real-time draft counters |
| 2 | Match System / Real World | 4/4 | 1-tap "⚡ Kit Técnico Previsto" matching inverter/modules, cable reel shortcuts (+5m, +10m, +25m, +50m) |
| 3 | User Control and Freedom | 4/4 | Persistent tab mounting + localStorage draft recovery (zero data loss), 1-tap clear selection |
| 4 | Consistency and Standards | 4/4 | Full Radix Dialog replacement for estorno, 44px-48px touch targets, 14:1 AAA Solar Yellow contrast |
| 5 | Error Prevention | 4/4 | High-vis amber warning when consumption exceeds warehouse balance, `inputMode="decimal"` keyboard |
| 6 | Recognition Rather Than Recall | 4/4 | Pre-populated project specs (kWp, modules, inverter model) embedded directly in materials header and kit card |
| 7 | Flexibility and Efficiency | 4/4 | 1-tap "Adicionar Kit Completo", quick-add multiplier pills, search with `useDeferredValue` |
| 8 | Aesthetic and Minimalist Design | 4/4 | High-contrast industrial OLED dark UI, zero decorative noise, clean 1px structural borders |
| 9 | Error Recovery | 4/4 | Dedicated estorno dialog with selectable audit reasons (Sobra, Erro, Avaria), in-app error feedback |
| 10 | Help and Documentation | 4/4 | Clear unit indicators, physical stock balance tags, project specification subtitles |
| **Total** | | **40/40** | **Excellent (Ship it)** |

#### Anti-Patterns Verdict
- **LLM Assessment**: High-craft industrial field WMS interface tailored specifically for rooftop solar installers and warehouse audit. Zero generic AI slop tells, zero blocking alerts.
- **Deterministic Scan**: **0 findings (`detect.mjs`)** across both files. All typography standardized to `DESIGN.md` tokens.
- **Visual Overlays**: Clean.
