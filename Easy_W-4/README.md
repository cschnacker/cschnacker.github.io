# Easy W-4 modernization

This workspace contains a replacement static web app. The original IIS app and Excel workbook were read only and remain unchanged.

## Run

With Node.js 20+ installed, run `npm start` and open http://127.0.0.1:4173. Run `npm test` for calculation regression checks. The app needs HTTP(S); opening index.html directly as a file does not support its JSON fetches.

## Layout

- `app/index.html`, `app/styles.css`, `app/ui/app.js`: responsive front end, inputs, results and in-app help.
- `app/data/2026.json`: annual values with named fields, provenance, federal and state tables, and policy constants.
- `app/data/config.json`: active year and available-year registry.
- `app/calculations/engine.js`: independent, DOM-free formula interpreter and marginal bracket calculations. No eval or runtime packages.
- `app/calculations/workbook-model.json`: source formulas and cached reference results, keyed by workbook cell for traceability.
- `app/calculations/corrections.js`: documented repairs, separate from the preserved source model.
- `app/changes.html`: repair log and limits of the source tax model.
- `tools/export_workbook.py`: read-only annual export from a workbook using openpyxl. Annual export does not overwrite calculation code.

## Annual update for a new store release

The public app has no annual-data tab or editor. Tax policy remains separate from the UI in `app/data/YYYY.json`.

1. Ask ChatGPT to review the new year's official federal and state sources and prepare a new `app/data/YYYY.json`. Update its tax year and all embedded lookup years consistently; use the `setTaxYear` helper in `app/data/validation.js` when appropriate. Changing the year alone does not update tax rules.
2. Update `app/data/config.json` to select the new active year. Keep prior-year files as needed.
3. Review all rates, thresholds, credits, deductions, and withholding policies. Changes in tax-law methods may require calculation code updates as well as data edits.
4. Run `npm test`, add independent examples for changed rules, and run `npm run build`.
5. Publish the new website, use its HTTPS URL in PWABuilder, increment package versions, and submit updates using the existing store identities and signing keys.

Saved calculator inputs remain separate by tax year. Users can export/import scenarios for the matching active year. No tax-data import/export controls are included in the store app.

## Annual update from Excel

Run `python tools/export_workbook.py "path/to/next-year.xlsx" --output staging-data` from this repository root (Python with openpyxl is required). It validates the sheet layout and consistent tax year and exports a JSON file. Review and edit the exported JSON, then place the reviewed version in `app/data/`.

The source workbook must keep the FEqn, FEqnWH and SEqn sheet layouts. The importer uses cached values for the reference tables, so calculate and save the source in Excel first. Hardcoded annual constants formerly embedded in formulas are exposed in `constants`; the importer carries the original baseline values and flags them for review. Do not assume those defaults are correct for a later year.

`--include-model` regenerates the source formula model as a separate, explicit operation. Use it only after reviewing formula changes, since corrections refer to the original model's cell layout. The tool never saves or edits the workbook.

## Deployment and storage

No external CDN, telemetry, server calculation, account, or database is required for the calculator. Optional AdSense loads Google advertising code only on configured HTTPS deployments. Copy only `app/` to the host. Relative URLs support subdirectories. JSON and JavaScript files must be served with the correct MIME types. Scenario input export/import saves user inputs separately from annual policy data. Calculator inputs autosave in local browser storage by tax year.

The old service worker used a generic origin-wide cache. This replacement does not register it or delete unrelated caches. Before replacing the old app at the same URL, test the old service-worker upgrade behavior and explicitly retire its registration at its original scope. Offline installability is not claimed for this version.

## Scope and verification

See [the repair log](app/changes.html). The original 697 cached formula results match before repairs. Tests cover repaired behavior with nonzero inputs, boundaries, four-job consistency and annual rollover. They do not certify all federal/state tax rules. The annual data is intentionally marked as requiring review; the Social Security wage limit was checked against SSA for 2026. Advanced source-model limits are visible in the app.

The 2026 reference value for the Social Security wage base is $184,500: https://www.ssa.gov/OACT/cola/cbb.html. Federal withholding review reference: https://www.irs.gov/publications/p15t.


Federal and state withholding are now independent per job. California uses annualized EDD 2026 Method B, with annual policy in `stateWithholding.California` inside the annual JSON and maintained in that annual JSON file. Other states offer a wage-and-bonus tax-table estimate or manual regular/bonus withholding. Review state settings after importing older inputs. Annual state liability remains the source workbook estimate. California SDI and complete state-specific benefit taxability are not implemented. Sources: https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf and https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de231ps.pdf

Suggested state withholding is the default for new scenarios. It estimates state tax on wages and bonuses with household non-payroll income set to zero, then allocates that amount across jobs by modeled taxable regular wages. Annual state liability retains all actual income, so uncovered interest, dividend, and other-income tax appears in the year-end balance. Federal W-4 elections do not change actual income or state withholding. It does not implement new tax rules or validate source tax tables. Same-state work only; multistate scenarios require manual withholding. Zero regular wages leave tax unallocated. Existing explicit Manual/Calculate modes survive import.

Calculator inputs automatically save in local browser storage by tax year and restore when reopening the same site in the same browser profile. Reset & clear saved inputs removes that year’s saved scenario. Tax tables are updated by the maintainer in the annual JSON file and released with a new version. Browser clearing/private browsing may remove saved inputs; use Export inputs for a portable backup.

## GitHub and PWABuilder release

Use `npm test` and `npm run build`. The deployment entry point is `dist/index.html`; upload **the contents** of dist to your HTTPS host. The root index.html is a convenience redirect to app/ for repository-root static hosting. Upload the entire repository ZIP to a new GitHub repository (unzip first), including the hidden .github folder. In repository Settings > Pages, choose GitHub Actions. The included workflow tests and deploys dist on pushes to main. There are no npm runtime dependencies and no npm install step is needed.

After hosting, open the public URL, confirm the manifest and icons load, then submit that URL to PWABuilder. Do not submit localhost or a file:// URL. For an update to an existing store app, preserve your existing Android package ID, signing identity, Windows identity/publisher, and hosted domain; increment store versions. Keep the existing signing files outside GitHub. Configure Android Digital Asset Links on the actual hosting origin using the certificate required by Play App Signing. This handoff contains web source and assets, not signed AAB/MSIX packages.

Read RELEASE.md for store asset mapping and remaining release checks. No offline support is claimed; the app currently requires an initial network load. The manifest contains standard 192/512 PNG icons, a separate maskable icon, and desktop/phone screenshots. Instructions and the worked example are built into the Help section. The privacy page is privacy.html under the deployed URL.

## Advertising

AdSense support is prepared in `app/ui/ads.js` and `app/data/ads.json`, using the same publisher account as the Effective Tax Rate Calculator. The supplied display-slot ID is configured; the production hostname cschnacker.github.io is configured. Live ads remain disabled pending AdSense site approval and consent setup. Read ADVERTISING.md before activation. The ad is separate from the calculation engine; no input or result objects are passed to it. Detected Windows WebView2 and unregistered Android WebView contexts are excluded.
