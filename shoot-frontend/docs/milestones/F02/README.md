# F02 — New York Contact Information Update

Status: **Implemented — Awaiting Review**

## Scope and implementation

Update only the New York contact tile on `/contact` and `/about-us` with the approved copy:

```text
NEW YORK
304 Park Ave South
Penthouse North
New York, NY 10010
Model Scout E-Mail: NewYork@imgtalents.com
Model Scout Tel: +1 (828) 357 7705
Main: +1 (212) 253 8884
```

Email destination: `mailto:NewYork@imgtalents.com`. Telephone destinations: `tel:+18283577705` and `tel:+12122538884`. Existing contact grid markup, line breaks, typography, CSS, routing and responsive layout are reused. Both routes use captured page HTML; their New York tiles were updated directly without introducing a separate rendering system. The superseded New York email and fax are removed. All other offices and page content are unchanged, verified against the baseline after masking only the New York tile.

## Affected files

- `shoot-frontend/data/pages/contact.json`: approved New York copy and actionable links.
- `shoot-frontend/data/pages/about-us.json`: same approved copy and links.
- `docs/MILESTONE_TRACKER.md`: F02 status and report link.
- `shoot-frontend/docs/milestones/F02/README.md`: implementation, validation and review report.
- `shoot-frontend/docs/milestones/F02/qa/results.json`: production browser metrics, text, link and click results.
- `shoot-frontend/docs/milestones/F02/qa/{contact,about-us}-{1440,390,320}.png`: six browser screenshots.

## Validation — 2026-11-21

- Locked dependency install (`npm ci --prefix shoot-frontend --ignore-scripts`): passed; 0 vulnerabilities.
- `npm run lint --prefix shoot-frontend`: passed.
- `npm test --prefix shoot-frontend`: passed, 37 Node tests and 3 Vitest tests (40 total).
- `npm run build --prefix shoot-frontend`: passed.
- Production build served with `PORT=4176 node shoot-frontend/dist/server.mjs` and tested in headless Chrome on both routes at 1440 × 900, 390 × 900 and 320 × 900.
- Exact visible copy, all three link destinations, six office tiles, tile viewport bounds and absence of horizontal overflow: passed in all six cases.
- Click events on each email/telephone anchor resolved to its approved protocol destination. OS application handoff was prevented during automation; delivery of email and actual phone calls were not attempted.
- Browser runtime exceptions: 0. Screenshots visually reviewed for desktop and mobile layout.
- Baseline comparison: all HTML outside the New York tile and all other JSON fields unchanged on both routes.

## Git and merge preparation

- Baseline: approved `origin/develop` at `41e419b` (F01 merge).
- Branch: `frontend/F02-new-york-contact-update`.
- Implementation commit: resolve using `git log -1 --format=%H -- shoot-frontend/data/pages/contact.json` on this branch.
- PR targets `develop`; PR URL and GitHub checks are recorded below once available.
- Existing F00 working-tree changes and the F01 worktree were preserved. No backend files, other office locations, unrelated routes or F03 work are included.
- No automatic merge is authorized or performed.

## Outstanding issues

No implementation issues found. Port 4173 is occupied by the existing F01 server, so the isolated F02 production build was verified on port 4176. After checkout/deployment, the default application port remains 4173.

