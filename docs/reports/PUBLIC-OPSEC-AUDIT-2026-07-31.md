# Public OPSEC audit — LPINv3

**Date:** 2026-07-31 (updated at LPINv3 ship)  
**Product:** LPINv3 forkable public tree  
**Target class:** `public-suite`

## Final gate status (ship)

| ID | Gate | Result |
|----|------|--------|
| O1 | Geographic OPSEC | **PASS** — catalog uses demo metros by state only |
| O2 | Secrets | **PASS** — no secret files tracked |
| O3 | Surface language | **PASS** — product UI paths clean |
| O4 | Densify default | **PASS** — lab flag blocked on product build |
| O5 | Portable paths | **PASS** — no host monorepo defaults |
| O7 | Typecheck + build | **PASS** |
| Host sample gate | **PASS** after denylist encoding + doc scrub |

## Historical gaps (closed)

| Gap | Resolution |
|-----|------------|
| Real municipality portfolio labels | Scrubbed to `Demo metro (ST)`; seed v9 |
| Lab harness dumps in git | `docs/test-runs/**` gitignored / untracked |
| `/workspace` QA defaults | Repo-local `screenshots/` + port **8090** |
| Product name | Public brand **LPINv3** |

## Dual track

| Track | Role |
|-------|------|
| Local / lab | Full experimentation (private densify, dual-window) |
| Public GitHub | [`AdventureNLearn/LPINv3`](https://github.com/AdventureNLearn/LPINv3) |

`npm run audit:public` is required before every public tag.
