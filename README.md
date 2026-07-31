# LPINv3

**Light · Proof · Integrity · Navigation**

Open tools for the jobsite and the claims desk. Device-local. United States. Guidance only — not a city portal login, not legal advice.

Public product name: **LPINv3** · Repo: [`AdventureNLearn/LPINv3`](https://github.com/AdventureNLearn/LPINv3)

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

## Develop (fork-friendly)

```bash
git clone https://github.com/AdventureNLearn/LPINv3.git
cd LPINv3
npm ci
npm run dev          # http://127.0.0.1:8090
npm run typecheck
npm run build
npm run audit:public # OPSEC + densify guard + typecheck + build (pre-publish)
npm run qa           # Playwright E2E (dev server must be up; LPIN_BASE_URL optional)
```

No monorepo, private lab, or host machine paths required.

Forkable release notes: **[docs/PUBLIC-RELEASE.md](./docs/PUBLIC-RELEASE.md)**.  
Lab densify (`npm run dev:lab`) is research-only — never the public default (D1).

## Credits

Open-source stacks that power LPIN (MapLibre, OpenStreetMap, Open-Meteo, TanStack, and others) are listed in **[ACKNOWLEDGMENTS.md](./ACKNOWLEDGMENTS.md)**. Please retain those notices when you redistribute.

## History

Public line: **LPINv3**. Earlier public tree: `LPINsuite_v2`. Archives: `LPINsuite-Archives`. See [ORIGIN.md](./ORIGIN.md).

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 AdventureNLearn (AOS).
