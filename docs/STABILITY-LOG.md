# LPIN Jobsite — Stability Log (running)

**Purpose:** Record UI thrash / bounce / eye-strain incidents, root causes, and fixes.  
**Rule:** When flicker, bounce, or multi-window yank is reported or detected, **log here first**, then ship a guard or fix in the same session.  
**Runtime ring:** session key `lpin-stability-ring` (browser). Code: `src/lib/jobsite/stability-guard.ts`.

---

## How to use this log

1. **Symptom** — what the operator saw (bounce, map fly loop, project flipping, jank).
2. **Trigger** — multi-window, project switch, map, portfolio seed, etc.
3. **Root cause** — feedback loop, persist thrash, object-identity effect, etc.
4. **Fix** — files + behavior change.
5. **Guard** — circuit breaker / debounce / skip-noop so it cannot silently return.
6. **Status** — open | mitigated | closed.

Append new incidents at the **top** of § Incidents (newest first). Never delete closed rows; supersede with a new ID if regression.

---

## Active guards (code)

| Guard | Location | Behavior |
|-------|----------|----------|
| Import no-op | `store.ts` `importJobsite` | Skip if same `id` + `updatedAt` |
| Soft import | `store.ts` `importJobsite` | Does **not** bump `updatedAt` (no save storm) |
| Debounced portfolio save | `use-project-workspace.ts` | 900ms debounce; key = id\|updatedAt |
| Upsert skip | `portfolio-store.ts` | Skip if same `updatedAt` + name |
| Debounced localStorage | `portfolio-store.ts` persist | ~1.2s write coalesce |
| Broadcast no local echo | `project-sync.ts` | Channel only; no same-window fan-out |
| Shared active write-if-changed | `project-sync.ts` | No storage event spam |
| Explicit sync only | `setActiveProjectId` / switch | Broadcast only on user switch |
| Map geo key | `SiteMapPanel.tsx` | Re-apply layers only when pin/layers change |
| **Thrash circuit** | `stability-guard.ts` | ≥4 project imports in 1.2s → block remote apply 8s + log |

---

## Incidents

### S-001 — Multi-window project bounce (eye strain)
| Field | Detail |
|-------|--------|
| **Date** | 2026-07-31 |
| **Severity** | High (operator closed all windows; visual stress) |
| **Symptom** | Entire project UI “wigging out” / bouncing; continuous flip or jank across dual-Z panes |
| **Trigger** | Jobsite multi-project workspace + 4 panes (board/map/schedule/materials) unlocked sync |
| **Root cause** | Feedback loop: `importJobsite` → `touch()` new `updatedAt` → portfolio upsert → full portfolio localStorage write → shared active id rewrite → other windows re-import → repeat. Local broadcast echo + map re-apply on new `siteGeo` ref amplified flicker. |
| **Fix** | Soft import; debounced saves; no-op upsert; no local broadcast echo; write-if-changed active id; map geo key; debounce portfolio persist |
| **Guard** | `stability-guard.ts` thrash circuit + this log |
| **Status** | **mitigated** (2026-07-31) — reopen only after hard refresh; verify no bounce before dual-Z default |
| **Operator note** | Windows closed deliberately due to eye strain. Do not auto-reopen multi-pane until S-001 verified calm. |

---

## Template (copy for next incident)

```md
### S-00N — short title
| Field | Detail |
|-------|--------|
| **Date** | YYYY-MM-DD |
| **Severity** | low / medium / high |
| **Symptom** | |
| **Trigger** | |
| **Root cause** | |
| **Fix** | |
| **Guard** | |
| **Status** | open / mitigated / closed |
```

---

## Verification checklist (after thrash-class fix)

- [ ] Single Jobsite window: switch project 5× — no flicker storm  
- [ ] Two unlocked windows: switch in A — B follows once, then idle  
- [ ] Locked window: switch in A — locked stays put  
- [ ] Map view: idle 10s — no continuous pan/zoom  
- [ ] DevTools console: no rapid `[LPIN-STABILITY] thrash` after cooldown  
- [ ] Append result line under the incident  

---

*Last updated: 2026-07-31 (S-001)*

### S-002 — Experiment session ready (simulation layout)
| Field | Detail |
|-------|--------|
| **Date** | 2026-07-31 |
| **Severity** | info |
| **Symptom** | n/a — operator requested full dual-Z open for upcoming Grok-app feature experiment |
| **Trigger** | Manual reopen after S-001 mitigations |
| **Root cause** | n/a |
| **Fix** | Layout: Board \| Schedule (left Z), Map \| Materials (right Z); stability guards active |
| **Guard** | S-001 mitigations + thrash circuit; watch for bounce during experiment |
| **Status** | **open / watching** — ready for new feature edit |

