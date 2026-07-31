# LPIN Communication Scale Test Bed — Benchmark Scorecard

**Status:** COMPLETE · All gates OPEN  
**Date:** 2026-07-31  
**Suite:** 56 projects (55 seed + 1 demo slot)  
**Plan:** `docs/COMM-SCALE-TESTBED-PLAN.md`  
**Lab source (pattern only):** `AdventureNLearn/lpin-jobsite-chat-lab`  
**Product:** `LPINsuite_v2` (local)  
**Artifacts:** `docs/test-runs/` · raw: `docs/test-runs/BENCHMARK-SCORECARD-raw.json`  
**PDF:** `docs/reports/COMM-SCALE-BENCHMARK-SCORECARD.pdf`

---

## Executive summary

A full-stack **device-local scale test bed** was built and validated across **56 US jobsites** to simulate streamlined **permitting, scheduling, and operations** communications at portfolio scale.

| Metric | Result |
|--------|--------|
| Phases executed | **P0 → P6** (7 gates) |
| Projects passing every gate | **56 / 56 (100%)** |
| US state coverage | **35 states (70%)** |
| Field communications (suite) | **2,688 messages** |
| Msgs / project | **min = p50 = p95 = 48** |
| Routing gaps (critical path) | **0** |
| National vendors | **28** (all span ≥2 projects) |
| Project coverage by nationals | **100%** |
| Open acks (suite) | **143** (tracked, not blocking) |
| Era freeze | Written under `docs/test-runs/*-P6-ERA-FREEZE.json` |

**Verdict:** Gate path is green. The suite is a viable baseline for further UI polish and selective production port — not a live deploy of the private chat lab.

---

## Phase scorecard

| Phase | Marker | Pass | Fail | Gate | Key suite results |
|-------|--------|-----:|-----:|------|-------------------|
| **P0** | `[P0-BASE]` | 56 | 0 | **OPEN** | count=56 · states=35 (70%) · ids unique |
| **P1** | `[P1-ORG]` | 56 | 0 | **OPEN** | avg **13.1** divisions · avg **7.4** contracts |
| **P2** | `[P2-COMM]` | 56 | 0 | **OPEN** | msgs p50=48 · total=2688 · routing_gaps=0 |
| **P3** | `[P3-VENDOR]` | 56 | 0 | **OPEN** | avg **5.5** vendors/log · avg **6.5** contracts/log |
| **P4** | `[P4-NATL]` | 56 | 0 | **OPEN** | **28** nationals · avg **15.96** projects/vendor · 100% coverage |
| **P5** | `[P5-DEPTH]` | 56 | 0 | **OPEN** | depth floor 40 · actual **48**/project · multi-scope + env beats |
| **P6** | `[P6-SCALE]` | 56 | 0 | **OPEN** | permit 100% · schedule 100% · gaps=0 · freeze written |

### Gate timing (latest harness runs)

| Phase | Duration |
|-------|---------:|
| P0 | 1 ms |
| P1 | 14 ms |
| P2 | 27 ms |
| P3 | 33 ms |
| P4 | 12 ms |
| P5 | 86 ms |
| P6 | 69 ms |

---

## Suite inventory

### Composition
| Bucket | Count |
|--------|------:|
| Seed catalog (`js_pf_*`) | 55 |
| Demo slot (`js_sample_demo`) | 1 |
| **Total** | **56** |

### Industry mix (seed)
| Industry | Projects |
|----------|--------:|
| multi_family | 8 |
| civil | 7 |
| industrial | 7 |
| education | 6 |
| hospitality | 6 |
| commercial | 6 |
| single_family | 5 |
| healthcare | 5 |
| renovation | 5 |

### Geography
- **35 US states** represented (~**70%** of US states)
- Cross-region: Pacific, Southwest, Texas, Southeast, Northeast, Midwest, Plains, Alaska, Hawaii

---

## Communication depth (P2 + P5)

| Metric | Value |
|--------|------:|
| Depth floor (plan) | 40 |
| Depth target | 48 |
| Achieved min / p50 / p95 | **48 / 48 / 48** |
| Suite total messages | **2,688** |
| Routing gaps | **0** |
| Division categorization | Required on every message |
| Multi-scope threads | ≥3 multi-scope msgs + ≥3 distinct divisions |
| Env risk beats | Present when project has env tags |

**Phases covered per project:** mobilization → walkdown → active_work → inspection → deficiency → resolution → closeout

---

## Org & vendor model (P1 + P3)

| Metric | Value |
|--------|------:|
| Avg divisions / project | 13.1 |
| Core divisions always present | 01 · AHJ · BD |
| Avg contracts / project | 7.4 |
| Prime + owner soft cost | Always |
| Dual GC contracts (cross-contract vendor log) | C-GC-01 + C-GC-ALW |
| Avg vendors in field-comm log | 5.5 |
| Avg contracts in field-comm log | 6.5 |
| Trade messages vendor+contract keyed | 100% |

---

## National vendors (P4)

| Metric | Value |
|--------|------:|
| Registry size | **28** (target ≥25) |
| Min projects per national | **≥2** |
| Avg projects / national | **15.96** |
| Project coverage | **100%** (56/56) |
| Affinity dimensions | regulatory · quality · procurement |

Categories include: steel, envelope, glazing, concrete, MEP, electrical, fire/life safety, env/SWQ, modular, logistics, roofing, commissioning, geotech, waterproofing, controls, public-fund compliance, etc. (fictional names only).

---

## Scale ops scorecard (P6)

| Check | Result |
|-------|--------|
| Permit / inspection traffic | **100%** projects |
| Schedule depth (≥3 tasks) | **100%** projects |
| Critical routing gaps | **0** |
| Open acks tracked | **143** suite-wide |
| Comms depth | p50=48 · total=2688 |
| Era archive | **Yes** (`*-P6-ERA-FREEZE.json`) |

---

## Fidelity & OPSEC

- Synthetic people, agencies, and vendors only  
- No real municipality portal logins  
- Geometry remains device-local; state owns AHJ packs  
- Private chat lab remains **pattern source** — not merged wholesale into production  
- Stability thrash (S-001) mitigated; multi-window review uses **locked** panes  

---

## How to reproduce

```bash
cd C:\AOS\products\LPINsuite_v2
npm run test:portfolio:gates
```

Phase review (4 locked dual-Z projects):

```powershell
powershell -File C:\AOS\desktop\Open-LPIN-PhaseReview.ps1 -Projects "js_pf_chi-highrise-mf,js_pf_hnl-hotel,js_pf_hou-petrochem-yard,js_pf_bos-education"
```

---

## Recommended next steps (outside this scorecard)

1. UI polish — desk-grade archive filters (division / vendor / contract)  
2. Selective production port — promote model + generators, not lab chrome  
3. Human sample audit — 5 projects read end-to-end for narrative quality  
4. Extend plan only if new gates (e.g. P7 mobile parity) are required  

---

## Source map

| Area | Path |
|------|------|
| Plan | `docs/COMM-SCALE-TESTBED-PLAN.md` |
| Harness | `scripts/qa-portfolio-comm.mjs` |
| Org generator | `src/lib/jobsite/project-org-generate.ts` |
| Comms + depth | `src/lib/jobsite/project-comm-generate.ts` |
| National vendors | `src/lib/jobsite/project-national-vendors.ts` |
| Scale scorecard | `src/lib/jobsite/project-scale-sim.ts` |
| UI surfaces | `src/components/jobsite/ScaleTestSurfaces.tsx` |
| Run archives | `docs/test-runs/` |

---

*Generated 2026-07-31 · LPIN Suite local scale exercise · Not legal advice · Not a city portal*
