# Public release track — LPINv3

**Purpose:** Ship a clean, independent Jobsite + Claims product to GitHub while private hosts keep full lab experimentation.

| Track | Where | Rules |
|-------|--------|-------|
| **Local / lab** | Operator machines + private testbed | Densify, dual-Z, scale harness, WIP mobile |
| **Public** | [`AdventureNLearn/LPINv3`](https://github.com/AdventureNLearn/LPINv3) | OPSEC clean, product seed only, portable, MIT |

## Fork quickstart

```bash
git clone https://github.com/AdventureNLearn/LPINv3.git
cd LPINv3
npm ci
npm run dev          # http://127.0.0.1:8090
npm run audit:public # OPSEC + densify guard + typecheck + build
```

No host monorepo, private submodules, or lab flag required.

## Before every public tag

1. `npm run audit:public` green  
2. Optional operator host OPSEC gate (if you maintain one)  
3. Smoke `/jobsite` and `/claims`  
4. Tag `public/vX.Y.Z` + GitHub Release notes  
5. Log ship in operator Working Document (if applicable)  

**Never** set `VITE_LPIN_LAB_SCALE=1` on a public product deploy (D1).

## Lab mode (research only)

```bash
npm run dev:lab
# or
npm run build:lab
```

Full 15‑minute portfolio densify is research-only. Forks that enable it accept the cost and labeling burden.

## What public does not ship

- Real municipality demo catalogs  
- Default IX-15M / ~285k streams  
- Host-only dual-monitor scripts  
- Operator skill chrome  
- Secrets / `.env.lab`  
- Raw harness `docs/test-runs/**` dumps (metrics reports OK)  
