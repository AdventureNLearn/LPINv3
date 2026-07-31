# LPIN Suite

**Light · Proof · Integrity · Navigation**

Open tools for the jobsite and the claims desk. Device-local. United States. Guidance only — not a city portal login, not legal advice.

## Apps

| App | Path | Purpose |
| --- | --- | --- |
| **Jobsite** | `/jobsite` | Field board: reports, building-department lane, inspections, schedule, materials |
| **Claims** | `/claims` | Score public claims Supported / Unproven / Disputed without fake certainty |

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

## History

Clean public tree. Prior development history is archived separately (offline mirror + GitHub archive repo `LPINsuite-Archives`).

## License

See LICENSE.
