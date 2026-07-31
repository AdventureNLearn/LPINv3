# LPINv3 — Build Guidelines

**Status:** ACTIVE (AdventureNLearn decisions D1–D7, 2026-07-31)  
**Companion:** `PUBLIC_SURFACE_CONTRACT.md` · `docs/PUBLIC-RELEASE.md`  
**Operator host (optional):** AOS ops HARD-RULES on the control-plane machine — not required to fork or build this repo.

These rules govern what may ship on a **public product path** vs what stays in **lab / research**. They protect industry users and regular Americans from lab-scale noise while preserving a defensible education and research track.

---

## Decisions (accepted)

| ID | Decision |
|----|----------|
| **D1** | Full **15‑minute interval densify** (portfolio-scale streams, ~285k msgs) **must never** be the default on a public product path. |
| **D2** | **Release authority:** AdventureNLearn may publish product under **any name, repo, or channel** whenever it chooses. These guidelines constrain *content safety*, not *brand or timing*. |
| **D3** | **Scale + extreme densify** primary home: private `lpin-comm-scale-testbed` (`main` freeze, `lab/*` experiments). |
| **D4** | **`lpin-jobsite-chat-lab`** remains private pattern source (Ternfield / routing). |
| **D5** | **`AOS-Public`** is the preferred **org-level educational hub** (literacy, principles, links)—not a code dump of generators. |
| **D6** | **Professionalize with docs + guards first**; feature port second. |
| **D7** | Public education datasets = **small samples + published metrics**, not full stream generators in default UX. |

---

## Lab vs Product

| | **Product path** | **Lab / research path** |
|--|------------------|-------------------------|
| **Purpose** | Daily use: board, reports, inspections, map, plain owner status | Scale simulation, process research, dual-monitor experiments |
| **Repos** | `LPINv3` (public GitHub product) | Private `lpin-comm-scale-testbed`, `lpin-jobsite-chat-lab` |
| **Default field logs** | Narrative / human-scale samples | Optional **IX-15M** full interval streams |
| **56-project portfolio densify** | Off unless explicit lab flag | On in lab branch / `VITE_LPIN_LAB_SCALE=1` |
| **Harness gates P0–IX** | Not required to run for ship | Required before claiming scale results |
| **End-user promise** | Device-local tool; not a city portal; not legal advice | Same honesty; plus “research mode” labeling |

### Hard ban (product default)

Do **not** in production builds unless `VITE_LPIN_LAB_SCALE=1` is **consciously** set for a private research deploy:

- Seeding every portfolio project with **full 15‑minute interval materialization** as the default field history  
- Implying the public app “contains 285k messages” as normal UX  
- Shipping dual-Z thrash harness or operator skill chrome as product UI  

### Allowed on product path

- Org / division / vendor / contract **models** (lightweight)  
- Routing rules (stop-work, inspection, closeout)  
- Multi-window open + **lock** (no thrash)  
- Small educational samples and digests  
- User-authored logs of any length the **user** creates  
- Open pack export of **user** data  
- Published **metrics** (e.g. benchmark scorecard numbers) without shipping the generator as default seed  

---

## Defensible principles (public + industry)

1. **Human final call** — software never auto-truths or auto all-clear.  
2. **Wire ≠ system of record** — field log is the wire; board/schedule/org are the record.  
3. **Structure before volume** — division / vendor / contract / routing before densify.  
4. **Two audiences, one truth** — Pro depth + Owner plain language; no conflicting facts.  
5. **Education ≠ legal/forensic software** — training and process aid only.  
6. **Not a city portal** — no municipality login simulation.  
7. **OPSEC** — no named municipal demos; no private PII in samples.  
8. **Export is freedom** — users can leave with open packs.  
9. **Freeze before extremes** — private snapshot before large experiments.  
10. **Gates before scale claims** — published scale numbers only from archived harness runs.  
11. **Sample in UI; full stream in research/harness** — label sample vs full clearly.  
12. **Release authority (D2)** — you may ship any product surface anytime; **safety rules still apply** to what that surface contains.

---

## Build flags

| Flag | Effect |
|------|--------|
| *(unset / production default)* | Product seed: **no** IX-15M interval densify. Narrative/light fieldComms only. |
| `VITE_LPIN_LAB_SCALE=1` | Lab seed allowed: 15‑min interval logs (sample persisted + `fullMessageCount`). **Research / private only.** |

```bash
# Normal product / public-safe local
npm run dev

# Explicit lab scale (private research)
# Windows PowerShell:
$env:VITE_LPIN_LAB_SCALE="1"; npm run dev
```

Production build guard:

```bash
npm run build          # fails if VITE_LPIN_LAB_SCALE=1 (refuse accidental lab prod)
npm run build:lab      # opt-in lab research build only
```

---

## Educational packaging (across AdventureNLearn)

| Audience | Primary home | Content |
|----------|--------------|---------|
| Regular Americans | Product UI + short guides (AOS-Public links) | Plain status, digests, small samples |
| Industry | Product Pro surfaces + docs | Routing, vendors, contracts, export |
| Educators / researchers | Private scale-testbed + published metrics | 56-project curriculum, IX-15M, gates |

---

## Code anchors

| Path | Role |
|------|------|
| `src/lib/jobsite/release-mode.ts` | Lab scale flag helpers |
| `src/lib/jobsite/project-seed.ts` | Seed respects lab flag |
| `src/lib/jobsite/project-comm-interval.ts` | IX-15M engine (lab) |
| `scripts/assert-public-build.mjs` | Blocks lab flag on default `build` |
| `PUBLIC_SURFACE_CONTRACT.md` | User-facing integrity kernel |
| Private `lpin-comm-scale-testbed` | Scale freeze + lab branches |

---

## Change control

- Amending D1–D7 requires an ops Working Document decision row.  
- D2 does **not** waive D1, D7, or production guards.  
- When in doubt: ship **less volume**, **more structure**, **clearer English**.
