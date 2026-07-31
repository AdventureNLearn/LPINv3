# Public release track (forkable product)

**Purpose:** Ship a clean, independent Jobsite + Claims product to GitHub while the host machine keeps full lab experimentation.

| Track | Where | Rules |
|-------|--------|-------|
| **Local / lab** | This machine + private testbed | Densify, dual-Z, scale harness, WIP mobile |
| **Public** | `AdventureNLearn/LPINsuite_v2` | OPSEC clean, product seed only, portable, MIT |

## Fork quickstart (strangers / CI)

```bash
git clone https://github.com/AdventureNLearn/LPINsuite_v2.git
cd LPINsuite_v2
npm ci
npm run dev          # http://127.0.0.1:8090
npm run audit:public # OPSEC + densify guard + typecheck + build
```

No `C:\AOS` monorepo, no private submodules, no lab flag required.

## Before every public tag

1. `npm run audit:public` green  
2. Host (optional but required for AdventureNLearn ship):  
   `powershell -File C:\AOS\ops\gates\Invoke-OpsecGate.ps1 -TargetClass public-suite -TargetPath C:\AOS\products\LPINsuite_v2`  
3. Smoke `/jobsite` and `/claims`  
4. Tag `public/vX.Y.Z` + GitHub Release notes  
5. Log ship in host Working Document  

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
- Host dual-Z dependency  
- Operator skill chrome  
- Secrets / `.env.lab`  
- Raw `docs/test-runs/**` harness dumps (metrics reports OK)  
