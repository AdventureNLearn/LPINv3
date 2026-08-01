# Trade Pack Framework — Heavy Landing Notes

**Status:** COMPLETE — Interview-hardened library landed on feat/trade-packs-v0.1 (schema v0.1 + 17 packs + trade-packs.ts + manifest)  
**Date:** 2026-08-01 (land complete)  
**Source of truth target:** AdventureNLearn/LPINv3 (Heavy)

## Evidence basis

Mapped against LPINv3 `main` (sha `9035c63`):

| Existing artifact | Path | How trade packs extend it |
|-------------------|------|---------------------------|
| `TradeDivision` | `src/lib/jobsite/types.ts` | Pack `division` must be this union — **all 17 covered** |
| `TRADE_DIVISIONS` | `src/lib/jobsite/divisions.ts` | Labels / short codes match |
| `ChecklistTemplate` | `src/lib/jobsite/checklists.ts` | Pack checklists use same `{id,label,match,items}` shape |
| `MaterialLine` seed pattern | `src/lib/jobsite/apply-template.ts` | Pack materials mirror template seed fields |
| Jurisdiction packs | `src/lib/jobsite/jurisdiction-packs.ts` + `public/packs/` | Same content-pack pattern; trade packs are sibling |

## Library inventory (interview-hardened)

| Division | packVersion | Notes |
|----------|-------------|-------|
| general | 0.1.1 | GC gates; verbal pre-rock invalid |
| sitework | 0.1.1 | SWPPP continuous; subgrade honesty |
| concrete | 0.1.2 | Spine Wave 1–2; pour-plan readiness |
| steel | 0.1.1 | Bolt grade tracking; stability first |
| carpentry | 0.1.2 | Spine; multi-gate super note |
| roofing | 0.1.1 | Dry-in ≠ final |
| waterproofing | 0.1.1 | Backfill coordination |
| mechanical | 0.1.1 | Damper accessibility; pre-rock |
| electrical | 0.1.2 | Spine golden; nail plates; generator backfeed P0 |
| plumbing | 0.1.1 | UW vs slab; fixture long-lead |
| fire_protection | 0.1.1 | Witness window readiness |
| drywall | 0.1.1 | Enforces GC pre-rock |
| glazing | 0.1.1 | IGU mark verification |
| flooring | 0.1.1 | Moisture gate |
| paint | 0.1.1 | Substrate before prime |
| materials | 0.1.1 | MaterialStatus mapping note |
| other | 0.1.1 | Stub; promote recurring scopes |

## Heavy file layout

```
public/packs/
  trade-manifest.json
  trades/
    *.v0.1.0.json   # filename stable; packVersion inside JSON

src/lib/jobsite/
  trade-packs.ts    # load, validate, list, applyTradePackMaterialSeed
```

## apply behavior (no new nav)

1. Validate `format === "lpin-trade-pack"` and `division` ∈ TradeDivision.
2. Optionally match pack checklists by `match[]` (do not silently delete GC templates).
3. Seed materials lines for that division (ids + timestamps via `newId`).
4. Sequence edges are advisory metadata — not auto-CPM.
5. Safety phrases are templates only — human still creates FieldReports.
6. Never claim compliance or energization authority.

## Landed-in-Heavy checklist

- [x] Schema committed (JSON Schema + TS types in artifacts)
- [x] All 17 packs under `public/packs/trades/` (branch land)
- [x] Manifest entry for each
- [x] `trade-packs.ts` validate + list + optional material seed
- [x] No new permanent Jobsite nav tabs
- [x] Interview Waves 1–2 deltas applied into pack content

## Post-land

Optional Build: Pack Library browser remains demo-only — never source of truth.  
Further field interviews revise packs → bump `packVersion` → refresh device cache.
