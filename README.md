# Garage

A personal garage companion for people with more than one vehicle. Track maintenance, reminders, fuel and mileage, and what each vehicle really costs. Everything runs in the browser and is stored in LocalStorage. There's no backend, no account and no cloud.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests for mileage, reminders, expense totals, storage, CSV
npm run lint       # oxlint (ESLint-compatible rules incl. React hooks and a11y), zero warnings allowed
npm run test:e2e   # browser tests (Playwright) against the production build
npm run check      # all of the above
```

**Before every push** a git hook (`.githooks/pre-push`, enabled by `npm install`) runs lint, unit tests and the browser tests. **Before every deploy** GitHub Actions runs the same checks; the site is only published if they pass, and pull requests get the checks without deploying.

Linting uses [Oxlint](https://oxc.rs) rather than ESLint because ESLint's TypeScript parser doesn't support TypeScript 7 (the native compiler this project builds with). The rules are the same ESLint ones; `.oxlintrc.json` explains each rule that's switched off.

Browser tests (`e2e/`): onboarding, refills by amount and mileage, reminders and notifications, expense totals, backup/reset/restore, corrupt storage, electric charging by battery %, service schedules, km updates, papers, calendar export, offline launch, and a no-sideways-scroll check of every page at 360px. Locally they use your installed Google Chrome; CI installs Playwright's Chromium.

`dist/` is fully static, and routing uses `#/…` hashes, so you can drop it on any static host or open it from a folder with no server rewrites.

## Using it

1. **Onboarding:** enter your first name, then add a vehicle (or skip it, or explore a demo garage).
2. **Overview:** greeting, this month's spend vs last month, what's due, your garage, spending chart, recent activity.
3. **Log things** with the **Add** button (top right, or the lime **+** on mobile): refills, maintenance, expenses, reminders, vehicles. Click any record anywhere to edit or delete it.
4. **Search:** `Ctrl/Cmd + K` or `/`.
5. **Settings:** name and photo, currency, units, date format, theme, alerts, backup/restore (JSON), demo data, reset.

## How the numbers work

- **Refills** are logged by amount paid (e.g. ₹500). Litres = amount ÷ price per litre; the price is remembered from the last refill.
- **Mileage** works without full tanks. Each refill's fuel is used up by the next, so mileage = km between the first and latest refill ÷ fuel bought in every refill except the latest. It's labelled an estimate and gets more accurate with each refill. If full-tank refills cover at least half the logged distance, the exact full-tank method is used instead (distance between full fills ÷ all fuel added in between). Needs two refills. Electric vehicles use kWh and km/kWh.
- **Electric vehicles** log charges by battery level (e.g. 20% → 100%) and odometer; the amount paid is optional (blank for home charging). Range per full charge = km driven ÷ battery % used × 100, where % used = level after one charge − level before the next. This is exact, not an estimate. With the vehicle's battery size (kWh) and home electricity rate set, the app also shows kWh and estimates the cost of home charges. Charges with no known cost are left out of expense totals.
- **Cost per km** = money spent in those same stretches ÷ km driven. It doesn't depend on litres. A missed (unlogged) refill makes both figures look better than they are.
- **No double counting.** Fuel and maintenance costs come only from their own logs. Manual expenses can't use the Fuel or Maintenance categories.
- **Reminders** can have a due date, a due odometer reading, or both. The more urgent condition wins. Logging maintenance with "Schedule the next one" creates the reminder, and logging the same job again completes it.
- **Insights** come only from the records you've logged.

## Reminder limitations (read this)

There's no server, so reminders are checked when the app opens, regains focus, becomes visible, or the day changes. Each alert stage (due soon, due today, overdue) fires once per due target; snoozing re-arms it. Browser notifications work only while the app is open in a tab. **Nothing can notify you while the browser is closed.** That would need push infrastructure and a backend.

To get alerts anyway, each dated reminder can be added to a calendar (reminder menu → "Add to Google Calendar" or "Add to phone calendar"). The `.ics` file is an all-day event with an alert at 9:00 on the reminder's lead day, so the phone's calendar alerts even when this app is closed. Odometer-only reminders have no date, so they can't be exported.

## Other helpers

- **Papers**: insurance, PUC, RC and similar, saved as details and expiry date only (no photos). Each paper keeps one renewal reminder: insurance and RC alert 30 days ahead, PUC 7 days. A new expiry date re-activates it.
- **Usual service reminders**: offered after adding a vehicle and from the vehicle menu. Typical intervals by vehicle type (e.g. engine oil every 3,000 km or 6 months on a petrol motorcycle). They're a starting point, not the maker's schedule. Reminder titles match maintenance categories, so logging that service completes the reminder.
- **Update km**: a reading on its own, without a refill or service. The Overview suggests it when a vehicle with km-based reminders has had no reading for 14 days, and suggests a backup when the last one is over 30 days old.
- **Install**: a web app manifest and service worker (`public/sw.js`) let it be installed to the home screen and opened offline. Pages load network-first, so new versions show when online.

## Data

- One key, `garage.data`, written through `src/lib/storage.ts` (the only module that touches LocalStorage).
- Versioned schema (`SCHEMA_VERSION`) with step-by-step migrations. Backups and stored data are validated with Zod.
- Unreadable stored data is kept under `garage.data.corrupt-<timestamp>` and the app starts fresh.
- If storage is full, the change is refused (and you're told) rather than half-saved. Photos and receipts are resized to JPEG before saving.
- Units are labels: switching km↔mi or L↔gal doesn't convert existing values.

## Structure

```
src/
  types/          domain types
  lib/            storage, schema + migrations, calculations, formatting, CSV, demo data
  store/          app data context (AppStore), pure state transitions (ops), UI context
  hooks/          reminder engine, theme, formatting
  components/     ui kit, layout (sidebar, top bar, mobile nav, search, notifications), charts
  features/       onboarding, dashboard, garage, maintenance, reminders, fuel, expenses, analytics, settings, forms
```
