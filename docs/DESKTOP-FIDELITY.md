# Desktop Jobsite Fidelity Freeze

**Tag:** `desktop/fidelity-v1`  
**Edition:** `desktop`  
**Product root:** `C:\AOS\products\LPINsuite_v2`  
**Status:** Freeze baseline for dual-shell work (mobile must not regress these)

This document freezes what “desktop Jobsite” means so the mobile edition can ship beside it without rewriting multi-window, portfolio, or dense-board behavior.

Related: [BUILD-GUIDELINES.md](../BUILD-GUIDELINES.md) · [PUBLIC_SURFACE_CONTRACT.md](../PUBLIC_SURFACE_CONTRACT.md) · [STABILITY-LOG.md](./STABILITY-LOG.md)

---

## 1. What is frozen

| Layer | Frozen as |
|-------|-----------|
| **Chrome** | Dense 9-tab desktop nav, wide shell, multi-window open, `ProjectWorkspaceBar`, `ScaleTestSurfaces` |
| **Domain** | Shared store / portfolio / org / fieldComms / nationals / integrity / packs / map — **not forked** |
| **Lab densify** | Off on product path (`VITE_LPIN_LAB_SCALE` only); never public default (D1) |

**Shell entry (after DF extract):**

- Router: `src/components/jobsite/JobsiteApp.tsx` (edition pick)
- Desktop layout: `src/editions/desktop/DesktopJobsiteShell.tsx`
- Detector: `src/editions/detect-edition.ts`
- Root marker: `data-edition="desktop"` on the desktop shell wrapper

---

## 2. Capability matrix (must not regress)

| Capability | Freeze requirement | Primary anchors |
|------------|--------------------|-----------------|
| Multi-window open | Pop-outs + dual-Z / phase-review scripts | `AppShell.openSuiteWindow`, desktop scripts under `C:\AOS\desktop` |
| Project sync + lock | Unlocked same-project live; locked multi-project compare | `project-sync`, `use-project-workspace`, `ProjectWorkspaceBar` |
| Portfolio switcher | Search / industry / state / lists; ~56 seed catalog | `project-catalog`, `project-seed`, `portfolio-store` |
| Full Jobsite views | feed, report, messages, inspections, desk, schedule, contacts, materials, map, project | `DesktopJobsiteShell` / former `JobsiteApp` views |
| Org / contracts / vendors | Visible on project / scale surfaces | `ScaleTestSurfaces`, org generators |
| Field comms archive | Filter by division; sample vs full labeled | `fieldComms`, interval modules (lab-gated seed) |
| National vendors | List with affinity reasons | `project-national-vendors` |
| Site map | Pin / draw / GeoJSON / site pack | `SiteMapPanel`, site-geo helpers |
| Integrity | P0 readiness blocks all-clear; human final call; OPSEC | `domain.ts`, HarborRules, `opsec:check` |
| Product build | Default build refuses lab densify | `scripts/assert-public-build.mjs`, `release-mode.ts` |

---

## 3. Explicit non-regressions

Do **not** “fix desktop” by:

- Removing multi-window open or dual-Z workflow  
- Collapsing the 9-tab desktop ribbon into the mobile 5-tab IA on large screens  
- Making IX-15M / full interval streams the product default  
- Softening P0 readiness or OPSEC for convenience  
- Forking store APIs so desktop and mobile disagree on truth  

Mobile may hide multi-window and use digests; **desktop must keep** dense tools.

---

## 4. QA checklist (desktop freeze)

### 4.1 Product build guard

```powershell
cd C:\AOS\products\LPINsuite_v2
npm run assert:public-build
# Full product build (optional, slower):
# npm run build
```

Expect: assert passes; lab densify flag **not** present on default path.

### 4.2 Single window smoke

1. `npm run dev` (product, port **8090** — do not touch Qwen **8080**)  
2. Open `http://127.0.0.1:8090/jobsite`  
3. Confirm `data-edition="desktop"` on shell (DevTools) when viewport ≥ desktop breakpoint / forced desktop  
4. Switch views: Board → Report → Schedule → Map → Site  
5. Switch portfolio project 3× — no import thrash / flicker storm (see STABILITY-LOG)

### 4.3 Dual-Z same-project (multi-window)

1. Unlock sync for one project (e.g. `js_pf_mia-highrise-mf`)  
2. Open four panes / dual-Z via suite window helper or phase-review script  
3. Edit a field report or note in one pane  
4. Confirm other unlocked panes update without thrash  
5. Lock a second window on a different project — no cross-bleed  

### 4.4 Lab path (optional, private only)

```powershell
npm run dev:lab
# or build:lab — never as public default
```

Confirm lab surfaces label research mode; product path still sample-only.

---

## 5. Edition boundary (for mobile work)

| Edition | Chrome | Domain |
|---------|--------|--------|
| `desktop` | This freeze | Shared |
| `mobile` | Board · Log · Plan · Map · More (5 tabs) | Shared |

Detection order (`detect-edition.ts`):

1. `?edition=mobile|desktop`  
2. `localStorage` `lpin-edition`  
3. Viewport / touch heuristic  
4. Default desktop when ambiguous  

Lab densify is **independent** of edition (D1).

---

## 6. Freeze record

| Field | Value |
|-------|--------|
| Freeze name | Desktop Jobsite fidelity v1 |
| Git tag | `desktop/fidelity-v1` |
| Shell | `src/editions/desktop/DesktopJobsiteShell.tsx` |
| Docs | This file |
| Next phase | M0 — `MobileJobsiteShell` skeleton (no desktop layout rewrite) |

When mobile ships, re-run §4 before claiming no desktop regression.
