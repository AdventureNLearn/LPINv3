# Acknowledgments

LPIN Suite is open source (MIT). This file credits the people and projects that make the suite possible. Product copy stays plain field language; deeper license text lives here and in dependency packages.

## Product stance

- **Guidance only** — not legal advice, not a city/county portal login.
- **Device-local boards** — your project pack and site map stay on this device until you export.
- **Geographic agnosticism** — state-level code packs; city/county freeform by the user; no municipality examples in shipped product surface.
- **Human final call** — software never auto-truths a status.

## Site map & geospatial (Jobsite)

| Project | Role in LPIN | License / notes |
| --- | --- | --- |
| **[MapLibre GL JS](https://maplibre.org/)** | Interactive site map (pin, draw, layers) | BSD-3-Clause — © MapLibre contributors |
| **[OpenStreetMap](https://www.openstreetmap.org/copyright)** | Raster basemap tiles | © OpenStreetMap contributors — [ODbL](https://opendatacommons.org/licenses/odbl/) |
| **[Open-Meteo](https://open-meteo.com/)** | Optional free geocoding / weather (user-triggered) | Open data APIs — no API key required for this use |
| **[GeoLibre](https://github.com/opengeos/geolibre)** (Qiusheng Wu / opengeos) | Interoperability inspiration — GeoJSON / site-pack handoff for local GIS | MIT — **not bundled**; export/import for round-trip with GeoLibre and similar tools |

LPIN does not claim endorsement by MapLibre, OSM, Open-Meteo, or GeoLibre. Map pin and layers are **user-owned** and never drive AHJ/code pack selection (state-first only).

## Application stack

| Project | Role |
| --- | --- |
| [React](https://react.dev/) | UI |
| [Vite](https://vite.dev/) | Build / dev server |
| [TanStack Start / Router / Query / Table](https://tanstack.com/) | Routing, start, data UI |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Radix UI](https://www.radix-ui.com/) / shadcn-style primitives | Accessible controls |
| [Zustand](https://github.com/pmndrs/zustand) | Device-local Jobsite board state |
| [Zod](https://zod.dev/) | Schemas where used |
| [Lucide](https://lucide.dev/) | Icons |
| [Sonner](https://sonner.emilkowal.ski/) | Toasts |
| [Playwright](https://playwright.dev/) | QA (development) |
| [Nitro](https://nitro.build/) | Production deploy adapter (Vercel preset) |

Exact versions and full license texts ship with `node_modules` after `npm ci`. Run `npm ls` for the lockfile-resolved tree.

## Jurisdiction & field data

- **State model-code guidance packs** under `public/packs/` are LPIN-maintained **field reference** — confirm adopted editions with the local building department.
- National free portal links (where shown) point at public agency sites; LPIN is not affiliated with those agencies.

## History

Public history for this product line starts at **`AdventureNLearn/LPINsuite_v2`**.  
Predecessor work is archived at **`AdventureNLearn/LPINsuite-Archives`** (read-only historical reference). See [ORIGIN.md](./ORIGIN.md).

## Contributing credit

If you contribute packs, maps, or code, keep OPSEC (`npm run opsec:check`): no named municipalities in shipped examples, demos, or fixtures. Prefer state-level depth (Florida FBC-style statewide guidance is the model).

---

*Light · Proof · Integrity · Navigation — open packs, honest boards.*
