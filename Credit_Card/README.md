# Credit Card Planner — SchnackerSoftwareSolutions™

## Run
Serve this directory over HTTP/HTTPS; do not double-click index.html (JavaScript modules and data loading require a web server).

For a local preview, double-click Start Planner.cmd, or run `node preview.cjs` from this directory, then open http://127.0.0.1:8765. Stop the server with Ctrl+C. Node is only needed for this optional preview and tests; the app itself has no build step or third-party runtime dependencies.

For IIS, point a new site or virtual directory at this folder. web.config supplies MIME types for the modules and JSON. Use HTTPS for PWA/offline capabilities on network hosts (localhost also works). Existing IIS configuration has not been changed.

## Independent modules
- data/annual.json: year, currency label (USD only in this release), default horizon and minimum-payment assumptions. These are defaults, not official card issuer rules.
- js/model.mjs: versioned user data schema and validation.
- js/database.mjs: IndexedDB persistence and portable JSON serialization.
- js/calculations.mjs: pure monthly projection calculations, no UI or storage dependencies.
- index.html, styles.css, js/app.mjs: interface, help, and user interactions.
- serviceworker.js and manifest.json: offline caching and PWA metadata.

## Annual maintenance
1. Back up user data with Export database.
2. Review data/annual.json; change year and defaults as appropriate. Existing plans do not change.
3. For application releases, increment the serviceworker.js CACHE version and update its FILES list if new assets are added. Keep the database name stable.
4. Run `node verify.mjs` with a modern Node release, then check the app in a browser.
5. Replace application files without clearing browser data. Export/import if the origin, browser profile, or machine changes.

## User database
The IndexedDB database is SchnackerSoftwareSolutions.CreditCardPlanner, version 1, object store plans, key active. It is separate from the website files. Export database creates a portable, readable JSON snapshot with application identifier, schemaVersion, settings, cards, and scheduled changes. Copy that file between machines and import it. No server, account, or cloud sync is required. Imports are validated before replacement. Keep backups outside the publicly served website directory. Clear my data deletes the active record; it does not delete exported files.

For schema changes, add an explicit migration in model.mjs and an IndexedDB version migration in database.mjs if the store structure changes. Do not silently accept unknown schemas. Avoid simultaneous editing in multiple browser tabs.

## Calculation behavior
Monthly interest is opening balance × APR / 1200. Minimum payment is max(dollar minimum, percentage of opening balance), capped to the amount owed. Extra payments and one-time payments are also capped. Recurring and one-time charges are added in the current month; their interest begins the following month. Money rounds to cents each month. Annual growth applies every 12 planning months before scheduled overrides. Scheduled recurring overrides persist. Payment allocations are independent per card.

This is a rebuilt planning model, not an Excel engine. It retains the original card input concepts while adding cent rounding, full-debt payment caps, a monthly table, and explicit future-change handling. Legacy spreadsheet chart sampling and age fields are not used. The original workbook and existing IIS application were not modified. Existing legacy browser/workbook values are not automatically migrated; enter them in the new app. Export/import supports this app's versioned JSON format, not XLSX.

## Verification
verify.mjs checks interest, payment caps, future charges, overrides, non-payoff, annual increases, JSON round-trip, invalid schemas, negative input, and duplicate scheduled months. Browser checks verified calculations, save indicator, restoration after reload, clearing the sample plan, and desktop/mobile layouts. In-page confirmations protect replacement and deletion.

## Branding
The interface includes SchnackerSoftwareSolutions™. No registered-trademark claim is made.


Payoff calculator: js/payoff.mjs provides each card's target-date controls. calculations.mjs solvePayment searches integer cents using the same monthly projection engine. Optional schema-v1 fields fixedPayment and payoffTarget preserve compatibility with older exports. A lock replaces recurring extra-payment settings without deleting them; minimums and one-time payments still apply. Run node verify-payoff.mjs for the focused payoff tests.
