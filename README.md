# LPINv3 Mobile Edition (M0)

Phone-first **Jobsite** + **Claims** — the field-ready mobile surface for [AdventureNLearn/LPINv3](https://github.com/AdventureNLearn/LPINv3).

This branch (`mobile/m0-as-built`) is the **exact running mobile product** as built and verified: Board-first open with sample board, role strip, photo notes on field reports, MapLibre site map, Setup instruction kit + gated checklist.

## Apps

| Path | What |
|------|------|
| `/` | Landing |
| `/jobsite` | Mobile shell — Board · Log · Plan · Map · Setup |
| `/claims` | Tri-state claim scoring |

## Publish open behavior

- Lands on **Board** with sample multi-family board
- Never auto-opens Setup / new project after publish
- Setup only via explicit user action; save gated by full checklist

## Develop

```bash
npm ci
npm run dev          # http://127.0.0.1:8080
npm run typecheck
npm run build
```

## Upstream integration

See [docs/MOBILE-M0-PR-NOTES.md](./docs/MOBILE-M0-PR-NOTES.md).

- Shell: `src/editions/mobile/MobileJobsiteShell.tsx`
- Detector: `src/editions/detect-edition.ts`
- Wire into dual-edition `JobsiteApp` when `edition === "mobile"`
- Do **not** regress desktop fidelity freeze on `main`

## License

MIT — same product line as LPINv3.
