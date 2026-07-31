# Desktop Jobsite Fidelity Freeze — LPINv3

**Tag:** `desktop/fidelity-v1`  
**Edition:** `desktop`  
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

**Shell entry:**

- Router: `src/components/jobsite/JobsiteApp.tsx` (edition pick)
- Desktop layout: `src/editions/desktop/DesktopJobsiteShell.tsx`
- Detector: `src/editions/detect-edition.ts`
- Root marker: `data-edition="desktop"` on the desktop shell wrapper

---

## 2. Capability matrix (must not regress)

| Capability | Freeze requirement | Primary anchors |
|------------|--------------------|-----------------|
| Multi-window open | Pop-outs + dual-window scripts | `AppShell.openSuiteWindow` |
| Project sync + lock | Unlocked same-project live; locked multi-project compare | `project-sync`, `use-project-workspace`, `ProjectWorkspaceBar` |
| Portfolio switcher | Search / industry / state / lists; seed catalog | `project-catalog`, `project-seed`, `portfolio-store` |
| Full Jobsite views | feed, report, messages, inspections, desk, schedule, contacts, materials, map, project | `DesktopJobsiteShell` |
| Org / contracts / vendors | Visible on project / scale surfaces | `ScaleTestSurfaces`, org generators |
| Field comms archive | Filter by division; sample vs full labeled | `fieldComms`, interval modules (lab-gated seed) |
| National vendors | List with affinity reasons | `project-national-vendors` |
| Site map | Pin / draw / GeoJSON / site pack | `SiteMapPanel`, site-geo helpers |
| Integrity | P0 readiness, human final call, OPSEC | `domain.ts`, HarborRules |
| Product build | Default build refuses lab densify | `scripts/assert-public-build.mjs`, `release-mode.ts` |

---

## 3. Explicit non-regressions

Do **not** “fix desktop” by:

- Removing multi-window open  
- Collapsing the 9-tab desktop ribbon into the mobile 5-tab IA on large screens  
- Making IX-15M / full interval streams the product default  
- Softening P0 readiness or OPSEC for convenience  
- Forking store APIs so desktop and mobile disagree on truth  

Mobile may hide multi-window and use digests; **desktop must keep** dense tools.

---

## 4. QA checklist (desktop freeze)

### 4.1 Product build guard

```bash
npm run assert:public-build
# optional full build:
# npm run build
```

### 4.2 Single window smoke

1. `npm run dev` → `http://127.0.0.1:8090/jobsite`  
2. Confirm `data-edition="desktop"` on shell (wide viewport)  
3. Switch views: Board → Report → Schedule → Map → Site  
4. Switch portfolio project 3× — no import thrash (see STABILITY-LOG)

### 4.3 Multi-window same-project

1. Unlock sync for one project  
2. Open multiple suite windows on the same project  
3. Edit a field report in one pane  
4. Confirm other unlocked panes update without thrash  
5. Lock a second window on a different project — no cross-bleed  

---

## 5. Edition boundary

| Edition | Chrome | Domain |
|---------|--------|--------|
| `desktop` | This freeze | Shared |
| `mobile` | Board · Log · Plan · Map · More (5 tabs) | Shared |

Detection order (`detect-edition.ts`): URL `?edition=` → `localStorage` `lpin-edition` → viewport heuristic (when enabled) → default desktop.

Lab densify is **independent** of edition (D1).

---

## 6. Freeze record

| Field | Value |
|-------|--------|
| Freeze name | Desktop Jobsite fidelity v1 |
| Git tag | `desktop/fidelity-v1` |
| Shell | `src/editions/desktop/DesktopJobsiteShell.tsx` |
| Public product | LPINv3 |
| Next phase | M0 — `MobileJobsiteShell` skeleton |
