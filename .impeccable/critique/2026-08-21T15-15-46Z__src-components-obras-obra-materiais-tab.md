---
target: materials/estoque in /obra
total_score: 40
p0_count: 0
p1_count: 0
timestamp: 2026-08-21T15-15-46Z
slug: src-components-obras-obra-materiais-tab
---
Method: dual-agent post-polish pass (Modal de Confirmação com Alerta de Estoque)

#### Design Health Score

| # | Heuristic | Score | Key Observation |
|---|-----------|:-----:|-----------------|
| 1 | Visibility of System Status | 4/4 | Detailed review modal displaying pre- and post-launch stock calculations (`Saldo Atual → Saldo Restante`) |
| 2 | Match System / Real World | 4/4 | Real physical inventory feedback; explicitly highlights quantity deficits against warehouse balances |
| 3 | User Control and Freedom | 4/4 | Zero blind submissions: step-by-step confirmation modal with "Voltar e Ajustar" and "Confirmar e Deduzir" |
| 4 | Consistency and Standards | 4/4 | 100% Radix Dialog standard, 44px-48px touch targets, 14:1 Solar Yellow AAA contrast |
| 5 | Error Prevention | 4/4 | High-vis amber alert banner when any launched item exceeds physical warehouse stock |
| 6 | Recognition Rather Than Recall | 4/4 | Shows item SKU, item description, deducting quantity, and recorded field observations |
| 7 | Flexibility and Efficiency | 4/4 | 1-tap confirmation with immediate online/offline sync feedback |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean, dense OLED dark UI, zero decorative noise |
| 9 | Error Recovery | 4/4 | Safe review step before database commit; full estorno flow available if errors occur |
| 10 | Help and Documentation | 4/4 | Explicit feedback tags on stock deficit calculations |
| **Total** | | **40/40** | **Excellent (Ship it)** |

#### Anti-Patterns Verdict
- **Deterministic Scan**: **0 findings (`detect.mjs`)** across `obra-detail-page.tsx` and `obra-materiais-tab.tsx`.
- **TypeScript**: **0 errors (`tsc --noEmit`)**.
