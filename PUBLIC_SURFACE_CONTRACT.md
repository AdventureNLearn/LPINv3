# Public Surface Contract

**Applies to:** Claims, Jobsite, LPIN Suite home, share/export text  
**Does not rewrite:** SuperGrok server skills under operator space (kept as written)

## Purpose

Skills **complement** these apps. They do **not** take over navigation, branding, or user-facing ideology. Public products stay **secular civic tooling**: verification honesty + field honesty only.

## Layer split

| Layer | Owns | Must not own |
|-------|------|----------------|
| **Public apps** | One job each, plain English, tri-state / P0–P3, clean gates, human final call | Mission Spine tokens, skill names, multi-agent theater, political or religious framing |
| **Operator skills** (as written) | Private design assist, audits, full verification rigor | Shipping UI, speaking *through* the product to end users |

## Integrity kernel (allowed in product)

These mechanisms may ship. Labels stay plain and professional.

1. **Tri-state only** — Supported (+1) · Unproven (0) · Disputed (−1). No 0–100 “truth meters.”
2. **Basis kinds (Evidence / Inference / Assumption)** — what kind of support a score rests on; not automated truth.
3. **Honesty flag** — plausible without a primary (original official) record.
4. **Clean-share / readiness gate (Layer-0 behavior)** — open −1 blocks clean Claims share; open stop-now (P0) blocks Jobsite “all clear.”
5. **Primary records > commentary** — original records beat second-hand recaps.
6. **Human final call** — software never auto-truths; a person decides scores and field status.
7. **No laundering uncertainty** — prefer “we do not know yet” over a polished false complete picture.
8. **No private PII in samples** — demo data stays public-safe.
9. **LPIN as operations metaphor only** — Light · Proof · Integrity · Navigation (harbor / steer true is fine).

## Banned on public surface

Do **not** put in UI, share packs, meta description, samples, or footers:

- Religious identity tokens or creeds (e.g. confessional slogans)
- Political campaign slogans or party framing
- Operator skill brand names as product chrome (`evidence-gate`, `shatter-protocol`, `mission-spine-guard`, `sovereign-lens`, agent IDs, 🐸 SHATTER, Frog Protocol)
- “Automated truth,” legal advice claims, or full national permit-database claims

Operator skills may still use their own language **in SuperGrok private work**. Before anything ships to product, apply:

> Extract verification **behavior** only → strip identity / political / religious tokens → map to plain labels → then ship.

## Complement budget (stops takeover)

| Skill influence | Allowed? |
|-----------------|----------|
| Improve score / gate / basis rules | Yes, if kernel-aligned |
| New primary user jobs or whole apps | No — stay Claims + Jobsite |
| Nav or screens named after skills | No |
| Public creed / mission slogans | No |
| Private operator checklists for designers | Unlimited |

## App mapping

### Claims

- Job: paste/pull X post → atomic claims → tri-state score → clean share when no open −1  
- Kernel: basis kind, honesty flag, Layer-0 clean share, human adjudicator  
- Not in app: full Shatter ritual, spine footers, skill jargon  

### Jobsite

- Job: field report → message permit office → schedule inspection (wired trail)  
- Kernel: P0–P3 honesty, visibility gap, readiness gate when stop-now is open, human ownership  
- Not in app: jurisdiction knowledge-graph UI, skill module names, spine tokens  

## Harbor rules (user-facing, shared)

1. Prefer an honest “we do not know yet” over a polished false complete picture.  
2. Original records beat second-hand commentary.  
3. A person makes the final call — not the software alone.  
4. Open gaps block “clean” / “all clear” until a human resolves them.  
5. Not legal advice · not a full national permit database · no accounts in this version.  

## Code anchors

| Path | Role |
|------|------|
| `src/lib/integrity/` | Kernel types, harbor copy, public footer, framing checks |
| `src/components/integrity/` | Shared HarborRules / IntegrityNotice UI |
| `src/lib/claimcard/domain.ts` | Tri-state + Layer-0 + secular export |
| `src/lib/jobsite/domain.ts` | Visibility gap + readiness gate |

## Operator note

SuperGrok skills remain the design/verification engine. This contract is the **export filter** so strong reasoning powers the apps without skill takeover or political/religious public framing.

## Geographic agnosticism (OPSEC)

Shipped product copy, packs, demos, and free-resource links must not name real municipalities or hometowns as examples. State-level guidance is fine. Users type their own city/county freeform. Enforce with `npm run opsec:check`.
