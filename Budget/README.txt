BUDGET PLANNER
SchnackerSoftwareSolutions(TM)

A buildless household budget planner with local persistence, portable JSON
backups, monthly income and expense projections, and planned future changes.

RUN
Use Node.js 18 or later: node server.mjs
Then open http://127.0.0.1:4173. Windows users may run Start-Budget.cmd.
The launcher uses an available bundled Codex runtime or node from PATH.
Do not open index.html directly through file://.

DEPLOY
The GitHub Pages app is served from /Budget/. All application URLs are
relative to this directory. IIS MIME mappings are supplied in web.config.
HTTPS or localhost is required for service workers and offline caching.
Visit online once before using offline. For each release, bump the cache
version in serviceworker.js. Close old app tabs and reopen after upgrading.
This replacement does not import data from the former SpreadsheetConverter
app or its Excel source. Enter legacy inputs once and export a JSON backup.

DATA AND PORTABILITY
Inputs save automatically in this browser profile under sss.budget.plan.v1.
The app folder does not contain your saved budget. Changing browser, host,
protocol or port uses a different storage origin. Export/import a JSON backup
to move data between machines or origins. CSV contains results only.
Clear saved data removes this app's local plan. Keep backups because browser
settings or private mode can remove or prevent local persistence.
Backups contain readable financial inputs. No cloud sync or account is used.

MAINTENANCE
- data/annual-defaults.json: yearly defaults, revision and category templates.
- src/model.mjs: schema, validation, category upgrades and backup format.
- src/storage.mjs: local persistence adapter.
- src/calculations.mjs: projection calculations independent of the interface.
- src/app.mjs, index.html, styles.css: interface and interaction.
Annual default changes apply to new plans. Existing plans retain their saved
year and assumptions. The 2.5% inflation and 3% income growth defaults are
planning assumptions inherited from the reference workbook, not live data.

BEHAVIOR
Amounts are monthly USD. Annual amounts multiply by 12. Income and expenses
compound once per year, with separate retirement settings for each person.
New retirement dates default to the current year; clear a date to continue
employment income. Retirement income is entered in retirement-year dollars.
Income amount controls adjust by $1,000 and also accept exact typed values.

New expenses default to the current calendar year. They are excluded before
their start year and after their end year. Both boundary years are inclusive.
Inflation starts after the first payment year. If an expense starts before
the projection, its entered amount is used at the projection start.
A zero inflation override means no growth; blank uses the plan default.
Investment/Savings represents a monthly budget contribution, not an account
balance or investment-return calculation. Miscellaneous is listed last.

Future changes replace amounts after that year's growth and then carry
forward. Changes to default inflation affect growth in their effective year.
Planned amounts do not override retirement dates or expense end dates.
Projections show every year for 1-100 years; ages are informational.

VALIDATION
Run: node --test tests/core.test.mjs
Core checks cover income and retirement transitions, spouse totals,
inflation, expense start/end boundaries, zero overrides, planned changes,
backups, persistence and scoped clearing. Browser verification also covered
saving, backup restore, offline reload, income controls and mobile layouts.

MIGRATION NOTES
This replaces the generated Budget0.24M app with modular source. It uses the
Budget 0.25_test.xlsx concepts but corrects observed spouse retirement income
omission and primary/spouse retirement-date cross-reference problems.
It does not claim cell-for-cell parity with that test workbook.
Store marketing assets are maintained separately in OneDrive/Packages/Budget.

PWABUILDER
After pushing and waiting for GitHub Pages deployment, analyze:
https://cschnacker.github.io/Budget/
The public site still serves the previous app until that deployment completes.
Use the HTTPS production URL, not localhost. Manifest start URL and stable ID
are /Budget/index.html; the scope is /Budget/. All icon paths are relative.

PNG files are physically included in icons/ at 32, 44, 48, 50, 71, 72, 96,
128, 144, 150, 152, 180, 192, 256, 300, 310, 384, 512 and 1024 pixels square.
The manifest advertises exact PNG sizes including 192 and 512. Separate
192/512 maskable files include extra safe-area padding. Apple touch icon is
180x180. These are inputs for PWABuilder; native package-specific assets
(including wide Windows tiles/splash screens) are generated during packaging.

When updating an existing store app, retain its existing package identity,
publisher identity and signing key, and increment the store package version.
Do not generate a replacement Android signing key for an existing listing.
The previously used Android package ID is com.cschnacker.budget. Verify the
root /.well-known/assetlinks.json fingerprint against the Google Play App
Signing certificate for the release you publish. No signing keys are stored
in this repository or changed by this update.

Local readiness checks verify manifest/icon retrieval, decoded image sizes,
Chromium installability diagnostics, service-worker control and offline
launch from /Budget/. A live PWABuilder analysis and store packaging must
follow deployment; they have not been claimed complete before pushing.
Sources: https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/android.md
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
