# Field Ledger — Design Plan v2

*Farm production & input tracking, built for Kenyan smallholder and small-commercial farmers*

This supersedes the original design plan. That plan assumed a Node/Express + PostgreSQL backend from day one; what actually got built is a **pure client-side app — no server, no database, no login.** Everything lives in the browser's `localStorage`. That wasn't a fallback or a compromise — it turned out to be the right foundation for the actual persona, and this plan treats it as a deliberate architectural choice worth protecting, not a limitation to eventually engineer away.

---

## 1. The persona, stated plainly

Every decision below is filtered through one lens: **a Kenyan farmer, roughly 30–50 years old, who is not tech-savvy, has no accounting or data-analysis background, and cannot rely on consistent internet access.**

Concretely, that means:
- They will not learn what "FCR," "weighted average cost," or "adjustment_out" mean, and shouldn't have to.
- A form with 9 equally-weighted options is worse than a form with 2 obvious buttons and a "something else" escape hatch.
- A screen with 8 numbers on it reads as *software I might break*, not *a tool that helps me*.
- If the app doesn't work the moment they open it — signal or no signal — it has failed at its one job.
- Money is Kenyan Shillings. Not an afterthought, not a config option — the default and only reasonable choice.

This persona is not a phase-one consideration that gets relaxed later. It's the permanent design constraint.

---

## 2. Where the app actually stands today

**Architecture:** React + Vite, Tailwind for layout, a small set of hand-rolled CSS files for component-specific styling, `localStorage` via a `usePersistentState` hook as the *only* persistence layer. No backend exists or is currently planned as a requirement (see §5 for how that could change without breaking the offline guarantee).

**What's built and working, on `main` right now:**
- **Units** — flocks, herds, or plots, with a starting headcount and an optional selling price for revenue estimates.
- **Daily logs** — production, feed use, mortality, per unit.
- **Expenses** — categorized costs, optionally linked to a specific unit, optionally linked to an inventory item + quantity purchased.
- **Inventory** — a real transaction ledger (not just a stock number): purchases, consumption, wastage, returns, transfers between units, corrective adjustments, sales, and stock counts. Balances are always *derived* from the ledger, never stored directly, so they can't drift out of sync.
- **The core linking feature**: recording a feed expense automatically creates a matching stock-in transaction — no second manual step. Logging feed use in a daily log automatically draws down real stock. Deleting either side keeps the other in sync, with guards against leaving stock at a negative balance.
- **Analytics & Dashboard** — cost-per-unit, revenue, and production summaries, both per-unit and farm-wide.
- **Automated tests** — Vitest unit/component tests (mid-60s and climbing) covering the ledger math, the linking logic, and component rendering; Playwright end-to-end scaffolding is written but has never been run against a real browser (see §6).

**In review, not yet on `main`** (branch `ux-persona-improvements`):
- KSh currency throughout, replacing hardcoded USD.
- Accounting jargon replaced with plain language across the app (transaction types, field labels, Dashboard/Analytics copy).
- Analytics cut from 8 simultaneous stats down to 2–3 headline numbers with the rest behind "See more."
- Progressive disclosure on the inventory transaction-type picker: two big buttons for the common cases, everything else behind "Something else?"
- `window.confirm()` replaced with a custom, friendlier confirmation dialog.
- Touch-target and readability pass: 16px input text (also avoids iOS Safari's zoom-on-focus), 44px minimum button height.
- A PWA manifest, icons, and a runtime-caching service worker — the app becomes installable and its own shell survives a page reload with zero connectivity.

**Known defects on `main` right now, both invisible to `npm run build` and to the test suite** (both should be treated as release blockers, not backlog items):
1. `src/index.css` has `@import` statements *after* `@tailwind` directives. Per the CSS spec this makes the imports silently fail — `.btn-primary`, `.btn-ghost`, and `.ledger-table` are completely absent from the compiled CSS. Every primary/ghost button and every table in the app is currently unstyled in production.
2. `TagChip.jsx` (the unit-picker in Daily Log, the period-picker in Analytics) never imports its own `tag-chip.css`, lost in a branch merge. Those pills also render unstyled.
3. Six dead files (`AppHeader.jsx`, `AppNavigation.jsx`, `AppView.jsx` and their CSS) from a superseded refactor attempt are still sitting in the repo, imported by nothing.

None of this is a design problem — it's cleanup that should land before any of the phases below.

---

## 3. The non-negotiable: offline-first, permanently

This is the part of the brief worth being explicit and a little dogmatic about, because it's the constraint most likely to erode quietly over time as the app grows features.

**The rule:** every feature that exists today, and every feature added in the future, must work correctly with *zero* connectivity, with no degraded mode, no "please reconnect" screen, no spinner that never resolves. Connectivity is something the app can *take advantage of* when available — for backup, for sync, for sharing — never something a farmer's daily workflow *depends on*.

**Why this is easy to get right today and easy to get wrong later:** right now, offline-first isn't a feature the team built — it's a side effect of having no backend at all. There is nothing to lose connection *to*. The risk shows up the moment any future phase introduces a server, an API call, or a "sync" button — at that point, offline-first stops being free and starts requiring deliberate engineering discipline to preserve. Phase 2 and Phase 3 below exist specifically to make sure that discipline is designed in from the start, not retrofitted after something breaks in a maize field with no bars of signal.

**Concrete standing rules for every future phase:**
- A network request is never on the critical path of saving a record. Writes save locally first, always, unconditionally.
- If a feature *requires* connectivity to function at all (e.g., sending an SMS), it must degrade to "unavailable right now, try again later" without blocking or breaking anything else in the app.
- No feature may silently send farm data anywhere. Any future sync/backup/sharing feature is opt-in, with a plain-language explanation of what leaves the device and why.
- Every new screen gets tested with the network disabled before it's considered done, not as an afterthought.

---

## 4. Phase 0 — Stabilize (before any new feature work)

This isn't really a "phase" so much as a gate. Nothing in Phase 1 onward should start until this is done.

- [ ] Merge `ux-persona-improvements` (currency, plain language, progressive disclosure, confirm dialog, touch targets, PWA).
- [ ] Fix the `@import` ordering bug in `index.css`.
- [ ] Fix the missing `tag-chip.css` import.
- [ ] Delete the six dead files from the superseded refactor.
- [ ] **Actually open the built app in a real mobile browser** — ideally a real low-end Android device, not just a desktop viewport resize — and click through every screen. Every CSS regression above passed both the build and the full test suite; only looking at it caught them. This should become a standing pre-release step, not a one-time fix.
- [ ] Confirm the service worker actually installs and the app loads with airplane mode on, on a real device.
- [ ] Run the Playwright E2E suite for real at least once (it's written but has never executed against an actual browser in this project's history).

---

## 5. Phase 1 — Deepen the persona fit

Everything here is refinement of what exists, aimed squarely at the "not tech-savvy, no accounting background" half of the persona. No new architectural surface area.

**Kiswahili.** Flagged and deliberately deferred earlier in this project specifically because bad translations in a money-tracking tool are worse than none — they erode trust exactly where trust matters most. The right shape for this: a small string-dictionary module and a language toggle, with the existing (tested, reviewed) English strings staying exactly as they are and Kiswahili added alongside — sourced from an actual fluent speaker, not generated speculatively. This is probably the single highest-impact item in this entire plan for the stated persona, and the one most likely to be underestimated in effort (it touches every screen).

**First-run experience.** Right now an empty app is just empty forms. A short, skippable first-run flow — "What does your farm produce?" walking straight into adding the first unit — would do more for a nervous first-time user than any amount of in-form copy polish.

**Backup and recovery, still offline.** The current known risk (documented, not yet solved): clearing browser data deletes everything with no way to recover it. The offline-first-compatible answer is *not* a cloud backup — it's a plain "export my data to a file" / "restore from a file" pair, using the phone's own file sharing (which itself increasingly works over Bluetooth/local transfer in the target market, not just internet). This is a genuinely safe way to add a safety net without touching the offline guarantee at all.

**Voice input for logging.** Worth prototyping, not committing to yet — typing numbers on a small screen with dirty hands in a coop is real friction this persona faces daily. Even simple numeric voice input for the most common fields (eggs collected, feed used) could matter more than further UI polish.

**Continued plain-language and readability passes**, informed by actually watching a real farmer use the app rather than guessing further from a desk.

---

## 6. Phase 2 — Selective connectivity, offline remains the default

This is where the app's scope could plausibly grow beyond one phone, one user. The heading is deliberately "selective" — every item here is opt-in, backgrounded, and never something the core workflow waits on.

**Multi-device use within one farm.** The most likely real-world need: more than one person (a farmer and a spouse, or a farmer and a hired hand) logging against the same records from different phones. This requires *some* shared state, which requires *some* server — but it does not require giving up offline-first if it's built the same way the sibling prototype in this project's history already proved out: local writes always succeed immediately with a temporary ID, a background queue replays them against a server once connectivity returns, and IDs get remapped transparently as dependent records sync in the correct order. That architecture already exists as working, tested code from an earlier exploration in this project and is the direct blueprint for this phase if it's ever built — it should not be redesigned from scratch.

**Sharing a summary, not syncing the app.** A farmer may want to send a simple production/cost summary to a cooperative, a buyer, or a family member. This doesn't need real-time sync at all — a "generate a shareable summary" feature that produces plain text or an image, sent through WhatsApp/SMS the farmer already uses, delivers most of the value with none of the offline-first risk. This should come *before* any real multi-device sync feature, both because it's simpler and because it's likely to matter more day-to-day.

**Optional low-stock / reminder alerts.** If ever built, these should degrade gracefully to "no alert" rather than depending on a background service the app can't guarantee is reachable — a local, on-open check ("you're low on X") costs nothing in reliability; an SMS-based alert requires infrastructure and should be scoped as a clearly optional, best-effort layer on top, never a dependency.

---

## 7. Phase 3 — Full backend sync (only if Phase 2 demand justifies it)

Only worth building if Phase 2's multi-device usage turns out to be common rather than occasional. If it happens, the constraint from §3 still applies without exception: the app must remain fully usable with zero connectivity, indefinitely, not just "until the next sync." A user who never has reliable internet should have an identical experience to one who does, with sync as an invisible bonus rather than a requirement anywhere in the interface.

This phase is intentionally left thin here rather than speced out — it should only be designed in detail once Phase 2 has real usage data behind it, not spec'd speculatively now.

---

## 8. Standing design principles (apply to every phase, every screen)

1. **Offline-first is not phase-specific — it's permanent.** See §3.
2. **Plain language, always.** If a term needs a tooltip to explain it to this persona, it needs a different word instead.
3. **Currency is KSh.** Not configurable, not defaulted to something else and localized later.
4. **Progressive disclosure over completeness.** Two obvious options beat nine equally-weighted ones. Rare/advanced actions are always reachable, never front-and-center.
5. **Large, high-contrast, sunlight-legible, one-handed-operable.** This is a field tool used outdoors, often one-handed, often in bright light.
6. **No feature ships without being opened on a real phone.** The two CSS regressions in §2 both passed automated checks and only failed a human actually looking at the screen.
7. **No silent data transmission, ever.** Any future feature that sends data anywhere gets explicit, plain-language consent — not a checkbox buried in settings.

---

## 9. What this plan deliberately does not do

It does not commit to a specific backend technology for Phase 2/3, because that decision should be made when (and if) real multi-device demand shows up, not speculatively now. It does not commit to a Kiswahili translation timeline, because that work needs a fluent speaker involved before it can be scoped honestly. And it does not treat the current localStorage-only architecture as a stopgap waiting to be replaced — for this persona, it may well be the right permanent shape for the core app, with connectivity-dependent features living alongside it rather than underneath it.
