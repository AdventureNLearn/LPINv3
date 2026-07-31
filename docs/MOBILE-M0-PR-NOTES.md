# LPINv3 Mobile — field-ready + full project setup

Phone-first Jobsite for PR into AdventureNLearn/LPINv3.

## Tabs

| Tab | Content |
|-----|---------|
| **Board** | P0 stack, report composer, photo notes, role lens |
| **Log** | BD lane + fieldComms, acks, compose with role metadata |
| **Plan** | Full CRUD: inspections, schedule, materials, contacts |
| **Map** | MapLibre pin/draw/GPS/locate + GeoJSON |
| **Setup** | Site identity, multi-project portfolio, pack handoff, role |

## Publish open behavior

- Persist key `lpin-mobile-jobsite-v4`
- Persists: projects, activeId, role only
- **Does not persist tab / setup section** — every open lands on **Board**
- Fresh users get sample multi-family board (not blank “new project”)
- Blank jobsite only via explicit Setup → New blank (with confirm)

## Role metadata

- Always-visible role strip on Jobsite (Field / Office / Owner / AHJ)
- Repeated in report composer, photo note composer, BD message composer
- Stamps `authorRole` + `authorName` on reports, photos, messages

## Photo notes

- Camera (`capture=environment`) + library
- Compressed JPEG data URLs (max ~1280px)
- Standalone notes + attach to field reports
- Included in pack export/import
- Cap 40 photos per project

## Layout

- Bottom nav always on `[data-edition="mobile"]`
- Scroll root `#lpin-scroll-root` clears fixed nav

## Upstream wire-up

Port shells against shared domain store — do not fork portfolio APIs.
Desktop dense chrome stays frozen.
