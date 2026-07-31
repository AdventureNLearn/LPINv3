# Public OPSEC audit baseline (R0)

**Date:** 2026-07-31  
**Tree:** `C:\AOS\products\LPINsuite_v2` @ `6cf16d9` (+ WIP after desktop fidelity freeze)  
**Target class:** `public-suite` (forkable GitHub product)  
**Doctrine:** HARD-RULES §1 · BUILD-GUIDELINES D1–D7 · PUBLIC_SURFACE_CONTRACT  

This report is the **gap list before any public push**. Do not treat local green as ship.

---

## 1. Gate results (snapshot)

| ID | Gate | Result | Notes |
|----|------|--------|-------|
| **O1** | Geographic OPSEC (`opsec:check`) | **FAIL** | `src/lib/jobsite/project-catalog.ts` — 55 projects with real municipality `city` values (Miami, Chicago, Houston, Boston, SF, LA, NYC, …). Also neighborhood names in `name` fields. |
| **O2** | Secrets in git | **PASS (local)** | `.env*` not tracked; `.env.lab` ignored by `.gitignore`. No `git ls-files` hits on env/pem. |
| **O3** | Public surface language | **PARTIAL** | Product UI generally clean. Docs mention Ternfield / private lab names — OK if confined to non-ship docs; strip from root README. |
| **O4** | Densify default | **PASS** | `assert-public-build` OK when `VITE_LPIN_LAB_SCALE` unset. |
| **O5** | Host / portable paths | **FAIL** | QA scripts hardcode `/workspace/screenshots` and `127.0.0.1:8080`. README documents port 8080 (product is **8090**; 8080 reserved for Qwen). |
| **O6** | PII samples | **PASS (spot)** | Catalog captains are fictional initials; no SSN patterns found in spot check. |
| **O7** | Typecheck | **PASS** | `tsc --noEmit` clean at audit time. |
| **O8** | Full product build | **NOT RUN** in R0 (deferred to R1 after scrub) |
| **O9** | Host ops gate | **NOT RUN** in R0 (run before R3 push) |

---

## 2. O1 inventory — municipality catalog

| Metric | Value |
|--------|-------|
| Portfolio projects | **55** |
| Unique `city` values | **55** (all real US municipalities) |
| Fail file (product path) | `src/lib/jobsite/project-catalog.ts` |
| Lab artifacts with city-bearing ids | `docs/test-runs/**` (**114** tracked files) — not in current geo walk roots, but unsafe for public |

Examples of denylist hits: Miami, Tampa, Jacksonville, Austin, Denver, Phoenix, Seattle, Chicago, NYC/New York, Los Angeles, San Francisco, Houston, Dallas, Boston, Atlanta.

**Policy:** Public ship must not use municipality names as demo localities (HARD-RULES 1.1). State-level + generic “demo metro” labels only.

---

## 3. O5 inventory — non-portable scripts

| Script | Issue |
|--------|-------|
| `scripts/qa-apps.mjs` | `/workspace/screenshots`, port 8080 |
| `scripts/qa-jobsite-wire.mjs` | same |
| `scripts/qa-mobile-first.mjs` | same |
| `scripts/qa-lpin-suite.mjs` | default BASE 8080; SHOT_DIR `/workspace/...` |
| `scripts/browser-smoke.mjs` | `/workspace`, 8080 |
| `scripts/preview-thumbnail.mjs` | 8080 default |
| `README.md` | documents `0.0.0.0:8080` |

---

## 4. Dual-track implications

| Keep local / private | Must not be public default |
|----------------------|----------------------------|
| Named-metro research catalog (lab file or private testbed) | Real city catalog on `main` |
| `docs/test-runs/**` harness dumps | 114 city-bearing JSON/md on public GitHub |
| `VITE_LPIN_LAB_SCALE=1` densify | Default seed densify |
| Host dual-Z under `C:\AOS\desktop` | Required path for forks |
| Ops Working Document | Product README dependency |

---

## 5. Gap list → R1/R2 work

| # | Gap | Phase | Owner action |
|---|-----|-------|--------------|
| G1 | Scrub or replace `project-catalog.ts` (region labels, safe slugs/names, coarse coords) | R1 | Product |
| G2 | Lab-only realistic catalog (gitignored or private repo) if still needed for dual-Z demos | R1 | Optional lab |
| G3 | Stop tracking `docs/test-runs/**` for public; metrics-only reports OK | R1 | gitignore + untrack |
| G4 | Expand OPSEC suite: secrets, portable, surface + `audit:public` | R1 | scripts |
| G5 | Portable QA defaults (cwd screenshots, port 8090) | R2 | scripts |
| G6 | README / PUBLIC-RELEASE fork quickstart | R2 | docs |
| G7 | GitHub Actions `public-gates` | R2 | CI |
| G8 | Host `Invoke-OpsecGate.ps1 -TargetClass public-suite` before push | R3 | ops |
| G9 | Explicit publish: tag `public/vX.Y.Z` — no silent push | R3 | human |

---

## 6. Ship decision (R0)

| Question | Answer |
|----------|--------|
| Ready to push to GitHub now? | **No** |
| Blocking? | **O1 catalog** + **O5 portability** + test-run volume |
| Densify safe? | Yes if lab flag off |
| Desktop fidelity freeze local? | Yes — tag `desktop/fidelity-v1` |

---

## 7. R1/R2 progress (same day)

| Item | Status |
|------|--------|
| Catalog scrub (demo metro by state, seed v9) | **Done** — lab original at `project-catalog.lab.ts` (gitignored) |
| `docs/test-runs/**` untracked + gitignored | **Done** (files remain local) |
| `audit:public` O1–O7 | **PASS** (including product build) |
| Portable QA / README 8090 | **Done** |
| GitHub Actions `public-gates.yml` | **Done** (activates on push) |
| Host Invoke-OpsecGate before push | **Pending R3** |
| `git push` / `public/vX.Y.Z` tag | **Blocked until explicit publish command** |

## 8. Next

**R3** only when you say **publish**: host ops gate → push origin/main → tag `public/v0.x.y` → GitHub Release notes.
