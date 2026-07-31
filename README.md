# LPIN Suite

**Light · Proof · Integrity · Navigation**

Open tools for the jobsite and the claims desk. Device-local. United States. Guidance only — not a city portal login, not legal advice.

## Apps

| App | Path | Purpose |
| --- | --- | --- |
| **Jobsite** | `/jobsite` | Field board: reports, building-department lane, inspections, schedule, materials, **site map** |
| **Claims** | `/claims` | Score public claims Supported / Unproven / Disputed without fake certainty |

### Jobsite site map

On **Site** (project setup): pin, draw a boundary, import/export **GeoJSON** and **site packs** for handoff to local GIS tools (e.g. GeoLibre). Geometry stays on this device and **never** overrides state-first AHJ / code packs.

## Geographic agnosticism (OPSEC)

This product does **not** ship named municipalities as examples, demos, or default portals.  
State-level guidance is fine. Users type their own city/county freeform.  

```bash
npm run opsec:check
```

## Develop

```bash
npm ci
npm run dev          # 0.0.0.0:8080
npm run typecheck
npm run build
npm run opsec:check
npm run qa           # Playwright E2E (dev server must be up)
```

## Credits

Open-source stacks that power LPIN (MapLibre, OpenStreetMap, Open-Meteo, TanStack, and others) are listed in **[ACKNOWLEDGMENTS.md](./ACKNOWLEDGMENTS.md)**. Please retain those notices when you redistribute.

## History

Clean public tree. Prior development history is archived separately (offline mirror + GitHub archive repo `LPINsuite-Archives`). See [ORIGIN.md](./ORIGIN.md).

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 AdventureNLearn (AOS).
