# Communication Scale Test Bed — Phased Build Plan

**Status:** ACTIVE  
**Opened:** 2026-07-31  
**Sources:**  
- Lab: `https://github.com/AdventureNLearn/lpin-jobsite-chat-lab` (local `(private chat-lab)`)  
- Product: `(product tree)`  
- Portfolio seed: `src/lib/jobsite/project-catalog.ts`  
**Target suite size:** **56 projects** (55 seed boards + 1 live/demo slot, or expand seed to 56)  
**Policy:** Lab is pattern source only — no blind merge to production. Archive + benchmark every phase gate.

---

## Visible test markers (use exactly these strings)

| Marker | Meaning |
|--------|---------|
| `[P0-BASE]` | Portfolio inventory + board integrity |
| `[P1-ORG]` | People · divisions · contracts per project |
| `[P2-COMM]` | Messages categorized by division + phase/routing |
| `[P3-VENDOR]` | Comms sortable by vendor × contract within project |
| `[P4-NATL]` | National vendors spanning projects |
| `[P5-DEPTH]` | Ternfield-class depth (volume + multi-scope log) |
| `[P6-SCALE]` | Permit / schedule / ops scale sim + benchmarks |

### Per-project result glyphs

| Glyph | Code | Meaning |
|-------|------|---------|
| `○` | `pending` | Phase not run |
| `◐` | `partial` | Some checks pass |
| `●` | `pass` | All phase checks pass |
| `✕` | `fail` | One or more hard fails |
| `⊘` | `blocked` | Prior phase gate failed |

### Console / report line format

```text
[P0-BASE] ● js_pf_mia-highrise-mf  PASS  state=FL industry=multi_family checks=8/8
[P2-COMM] ✕ js_pf_anc-healthcare   FAIL  missing division on 12 messages
```

Harness: `npm run test:portfolio` → `scripts/qa-portfolio-comm.mjs`  
Artifacts: `docs/test-runs/` (JSON + MD, timestamped)  
Stability: thrash incidents still go to `docs/STABILITY-LOG.md`

---

## Goals (what “done” means)

1. **Same communication depth** on every portfolio project (lab-grade, not one Ternfield-only demo).  
2. **Division categorization** on all field/permit/ops communications.  
3. **Vendor × contract × project** sort/log paths.  
4. **National vendors** shared across projects by regulatory / quality / procurement affinity.  
5. **Scale sim** for streamlined permitting, scheduling, operations.  
6. **Fidelity:** phase-gate archives + benchmarks so we never lose lineage.

Non-goals (this plan): Claims app work; production deploy of the private lab; real municipality PII.

---

## Phase plan

### Phase 0 — Baseline inventory & harness  `[P0-BASE]`
**Objective:** Know exactly what the 56-project suite is and prove each board is loadable.

| Check ID | Hard fail if |
|----------|----------------|
| `P0.1` | Project id missing or non-unique |
| `P0.2` | Missing name / stateCode / industry |
| `P0.3` | Missing site pin (lat/lon) |
| `P0.4` | `metaToJobsite` throws or empty id |
| `P0.5` | No schedule after industry template (warn only if industry unset) |
| `P0.6` | State coverage &lt; 40% of US (suite-level) |
| `P0.7` | Suite size ≠ target 56 (warn if 55 seed only — track as gap) |
| `P0.8` | OPSEC: no real-geo municipality login claims in notes |

**Deliverables:**  
- This plan  
- `scripts/qa-portfolio-comm.mjs` with `[P0-BASE]` markers  
- First archived run under `docs/test-runs/`

**Gate:** ≥95% projects `●` on hard checks; suite inventory archived.  
**Exit:** Proceed to P1 only after gate.

---

### Phase 1 — Org model per project  `[P1-ORG]`
**Objective:** Every project has People · Divisions · Contracts (Ternfield `project-org` pattern, project-scaled).

| Check ID | Hard fail if |
|----------|----------------|
| `P1.1` | No divisions list (min CSI-ish set for industry) |
| `P1.2` | No contracts (min 1 prime + 1 trade or owner soft) |
| `P1.3` | Contract without `divisions[]` or contractor name |
| `P1.4` | No people/roles mapped to divisions |
| `P1.5` | Contract NTP / status missing |

**Deliverables:**  
- `src/lib/jobsite/project-org-types.ts` + generator from industry/env  
- Persist org on portfolio boards  
- UI: org panel (lab `ProjectOrgPanel` pattern)  

**Gate:** 100% projects `●` on P1 hard checks.  
**Archive:** snapshot of org graphs (JSON).  

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · avg 13.1 divisions · avg 6.4 contracts

---

### Phase 2 — Communication model + division category  `[P2-COMM]`
**Objective:** Messages are first-class: kind, phase, roles, **division**, optional multi-scope.

| Check ID | Hard fail if |
|----------|----------------|
| `P2.1` | Project has zero communications after depth seed |
| `P2.2` | Any message missing `division` (or scopes[]) |
| `P2.3` | Unknown division code not in project org |
| `P2.4` | Phase routing gap rules not applied (deficiency without super/foreman) |
| `P2.5` | Archive cannot filter by division |

**Deliverables:**  
- Comm types aligned with lab `ChatMessage` (product-safe subset)  
- Process pipeline (claims score optional; routing gap required)  
- Comm archive with division filter  

**Gate:** 100% projects pass division completeness after seed.  
**Benchmark:** msgs/project p50/p95; routing gap rate.

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · msgs p50=20 total=1076 · routing_gaps=0  

### P2 implementation map
| File | Role |
|------|------|
| `src/lib/jobsite/project-comm-generate.ts` | Comm model, routing, seed log, filters, validate |
| `src/lib/jobsite/types.ts` | `Jobsite.fieldComms` |
| `src/lib/jobsite/project-seed.ts` / `demo.ts` | Attach fieldComms on seed |
| `scripts/qa-portfolio-comm.mjs` | `[P2-COMM]` checks |

---

### Phase 3 — Vendor × contract logging  `[P3-VENDOR]`
**Objective:** Sort and log communications by **vendor across contracts within each project**.

| Check ID | Hard fail if |
|----------|----------------|
| `P3.1` | Message with trade content missing `contractId` or `vendorId` |
| `P3.2` | Vendor not linked to at least one contract |
| `P3.3` | Cannot group archive: by vendor, by contract |
| `P3.4` | Cross-contract same vendor not visible inside one project |

**Deliverables:**  
- Vendor entity on project  
- Message fields: `vendorId`, `contractId` required for trade traffic  
- Archive sort modes: Vendor · Contract · Division · Phase · Time  

**Gate:** All trade messages on all projects vendor+contract keyed.  
**Archive:** per-project vendor comm index.

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · avg vendors in log 5.5 · avg contracts 6.5  

### P3 implementation map
| File | Role |
|------|------|
| `project-org-generate.ts` | Dual GC contracts (`C-GC-01` + `C-GC-ALW`) per vendor |
| `project-comm-generate.ts` | All msgs keyed; vendor/contract indexes; `validateProjectVendorComms` |
| `scripts/qa-portfolio-comm.mjs` | `[P3-VENDOR]` checks |

---

### Phase 4 — National vendors (cross-project)  `[P4-NATL]`
**Objective:** Shared national vendors appear on multiple projects by scope affinity (regulatory, build quality, procurement).

| Check ID | Hard fail if |
|----------|----------------|
| `P4.1` | &lt; N national vendors in registry (target ≥ 25) |
| `P4.2` | National vendor with only 1 project attachment |
| `P4.3` | Affinity tags missing (reg / quality / procurement) |
| `P4.4` | Cross-project vendor ledger cannot list all project ids |

**Deliverables:**  
- `national-vendors.ts` registry  
- Attach by industry + env + interest tags  
- Cross-project vendor dashboard (lab-safe, local only)  

**Gate:** ≥80% projects share ≥1 national vendor; ≥25 national vendors.  
**Benchmark:** avg projects/vendor; coverage by industry.

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · **28 nationals** · avg **15.96 projects/vendor** · **100%** project coverage  

### P4 implementation map
| File | Role |
|------|------|
| `project-national-vendors.ts` | Registry (28), match, ledger, validate |
| `project-seed.ts` | Attach nationals when building portfolio |
| `types.ts` | `Jobsite.nationalVendors` |
| `scripts/qa-portfolio-comm.mjs` | `[P4-NATL]` suite + per-project markers |

---

### Phase 5 — Depth fill (Ternfield-class)  `[P5-DEPTH]`
**Objective:** Volume + multi-scope narrative depth per project (scaled from 500-msg historical pattern).

| Check ID | Hard fail if |
|----------|----------------|
| `P5.1` | msgs/project below depth floor (e.g. 40 min / 120 target — tunable) |
| `P5.2` | Missing inception + active + closeout phases |
| `P5.3` | No multi-division threads |
| `P5.4` | Special conditions / env risks never referenced in comms where env tags exist |

**Deliverables:**  
- Historical densifier adapted from lab `historical-log.ts`  
- Per-industry templates + env risk beats  
- Quota-aware generation  

**Gate:** 100% projects meet depth floor; sample audit of 5 projects human-reviewed.  
**Archive:** full message packs per project (device-local).

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · **min/p50=48 msgs** · **total=2,688** suite-wide  

### P5 implementation map
| File | Role |
|------|------|
| `project-comm-generate.ts` | `densifyCommLog`, floor 40 / target 48, env beats, multi-scope standups |
| `validateProjectCommDepth` | P5.1–P5.6 |
| `scripts/qa-portfolio-comm.mjs` | `[P5-DEPTH]` |

---

### Phase 6 — Scale sim: permit · schedule · ops  `[P6-SCALE]`
**Objective:** Full test exercise — streamlined permitting, scheduling, operations across suite.

| Check ID | Hard fail if |
|----------|----------------|
| `P6.1` | Permit/inspection traffic missing on ≥10% projects |
| `P6.2` | Schedule tasks not linked to any comm/vendor where critical path |
| `P6.3` | Open P0 without routing path to super/foreman |
| `P6.4` | Suite benchmark export missing (latency, gaps, SLA, depth) |
| `P6.5` | No era archive of the run |

**Deliverables:**  
- Scenario runner (lab `ScenarioRunner` pattern) over portfolio  
- Suite dashboard: metrics p50/p95, routing gaps, SLA, open acks  
- Archive freeze under `docs/test-runs/` + ops working doc append  

**Gate:** Suite-level scorecard green; archive committed/copied.  
**Exit:** Ready for product UI polish / selective production port.

**Status (2026-07-31):** **COMPLETE — gate OPEN** · ●56/56 · permit 100% · schedule 100% · routing_gaps=0 · msgs p50=48 · era freeze written  

### P6 implementation map
| File | Role |
|------|------|
| `project-scale-sim.ts` | Per-project + suite scorecard |
| `ScaleTestSurfaces.tsx` | Visible org/comms/nationals UI |
| `scripts/qa-portfolio-comm.mjs` | `[P6-SCALE]` + ERA-FREEZE JSON |

### Phase display policy
On each phase gate **and each “proceed” after gates**: open **4 locked panes on dual Z** with **different projects** so operators can inspect surfaces without sync thrash.

**Post-P6 status:** Test bed complete at narrative depth; **extreme densify** added as **`[IX-15M]`**.

### Extreme densify — `[IX-15M]` (15-minute field logs)
| Rule | Value |
|------|--------|
| Cadence | **Every 15 minutes** during field work |
| Field clock | Mon–Fri **07:00–15:00** (32 logs/workday) |
| Duration source | Industry schedule typical days (90–320 by type) |
| Content drivers | Progress → phase · division · vendor/contract · env · national tags |
| Persist strategy | `fullMessageCount` + **sample ≤480** (localStorage-safe) |
| Suite total (full streams) | **~285,504** messages |
| Range | min **2,048** (renovation) · p50 **5,440** · max **7,296** (healthcare) |
| Gate | **OPEN** ●56/56 |

Engine: `src/lib/jobsite/project-comm-interval.ts` · seed v**8**

### Full suite freeze (P0–P6)
| Phase | Gate |
|-------|------|
| P0 BASE | OPEN ●56 |
| P1 ORG | OPEN ●56 |
| P2 COMM | OPEN ●56 |
| P3 VENDOR | OPEN ●56 |
| P4 NATL | OPEN ●56 (28 nationals) |
| P5 DEPTH | OPEN ●56 (48 msgs/project) |
| P6 SCALE | OPEN ●56 + ERA-FREEZE |

---

## Execution order (strict)

```text
[P0-BASE] ──gate──► [P1-ORG] ──gate──► [P2-COMM] ──gate──► [P3-VENDOR]
                                                              │
                                                              ▼
                                                         [P4-NATL]
                                                              │
                                                              ▼
                                                         [P5-DEPTH]
                                                              │
                                                              ▼
                                                         [P6-SCALE] ──archive──► freeze
```

No phase skips. If a project is `⊘ blocked`, fix or quarantine with reason in the run log.

---

## Suite inventory target (56)

| Bucket | Count | Notes |
|--------|------:|-------|
| Seed catalog (`js_pf_*`) | 55 | Cross-industry, 35 states (~70% US) |
| Sample / live board slot | 1 | Demo or user board registered in portfolio |
| **Target** | **56** | P0 reports actual; expand seed if short |

---

## Archive & benchmark cadence

| When | What |
|------|------|
| Every phase gate | `docs/test-runs/YYYYMMDD-HHMMSS-Pn-summary.md` + `.json` |
| Every depth seed | Portfolio snapshot note (size, msg totals) — no secrets |
| Thrash / bounce | `docs/STABILITY-LOG.md` |
| Phase complete | Working Document session append (ops) |

Benchmark fields (minimum):  
`projects_total`, `projects_pass`, `projects_fail`, `msgs_total`, `msgs_p50`, `msgs_p95`, `routing_gaps`, `sla_breaches`, `national_vendors`, `duration_ms`.

---

## Fidelity / OPSEC

- Fictional people and agencies only (lab pattern).  
- No real AHJ login simulation.  
- Geometry remains device-local; state owns code packs.  
- Lab remains private; product gets ported models only.

---

## Immediate next actions

1. ✅ Publish this plan  
2. ✅ Implement `[P0-BASE]` harness + run all projects  
3. ✅ P0 gate OPEN (56/56)  
4. ✅ Implement `[P1-ORG]` generator + harness + seed attach  
5. ⬜ Human review P1 scorecard  
6. ⬜ Start P2 communication model  

### P1 implementation map
| File | Role |
|------|------|
| `src/lib/jobsite/project-org-types.ts` | People / division / contract / vendor types |
| `src/lib/jobsite/project-org-generate.ts` | Deterministic org generator + `validateProjectOrg` |
| `src/lib/jobsite/project-seed.ts` | Attaches `org` on every seed board |
| `src/lib/jobsite/demo.ts` | Demo slot org |
| `src/lib/jobsite/types.ts` | `Jobsite.org` |
| `scripts/qa-portfolio-comm.mjs` | `[P1-ORG]` checks |

---

*Plan owner: Grok Build session · Product: LPINv3 · Lab: lpin-jobsite-chat-lab*
