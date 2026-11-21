# Income & Tax Planner

SchnackerSoftwareSolutions™

## Run locally

Use Node.js 22 or newer. From this folder, run `node tools/serve.mjs` and open [the local planner](http://127.0.0.1:8139/). The app has no package dependencies or build step. Run `node --test tools/check.mjs` to validate the annual releases, the calculation examples, and backup compatibility.

## Update for a new tax year

1. Publish or locate the matching annual version 1 `tax-data.js` in Effective Tax Rate Fed/State. Reuse that app’s federal and state schedules with `pwsh -File tools/sync-tax-data.ps1 -Source <path-to-tax-data.js>`. This writes `data/tax-YYYY.json`. Schedule rates are percentages and each upper limit is in dollars. An unlimited final bracket uses `null`. A finite last bracket intentionally limits the supported income.
2. Copy `data/planner-2026.json` to `data/planner-YYYY.json`. Match the shared release year and ID. Update federal standard deductions, capital-gain limits, payroll amounts, Social Security thresholds, dependent-credit rules and state allowances from the applicable sources. State allowances use the shared filing schedule keys. Maintain the sources list in the supplement.
3. Add the year to `data/releases.json`, retain the previous releases, run the checks, and verify a known tax example against the new amounts. Increment the version at the top of `serviceworker.js` and update the matching stylesheet and script version tags in `index.html` so browsers pick up the new assets.
4. Publish the files in the existing GitHub Pages `Income_and_Tax/` directory. Keep the relative asset paths and existing app scope. The local tools are for development.

A newly opened plan defaults to the latest bundled year. Existing plans retain their selected starting year. The projection uses the most recent bundled release at or before each forecast year and indexes it forward according to the plan. Forecasts before the first release use the earliest baseline without indexing.

## Source layout

- `data/` holds shared tax schedules and the planner’s annual supplements.
- `src/model.mjs` describes editable plan modules and defaults. `src/storage.mjs` saves those modules in IndexedDB, and `src/legacy.mjs` restores eligible inputs from the last SpreadsheetConverter release on the same origin.
- `src/calculations.mjs` projects a plan using the supplied tax release. The calculation engine has no browser storage or UI dependencies.
- `index.html`, `styles.css`, and `src/app.mjs` are the interface. The Help page explains the calculation scope and assumptions.

The browser database and downloaded JSON backups contain personal plan inputs. Keep backups outside the public repository. Browser-managed offline caches contain only application files and public tax tables. Use `E:\IncomeAndTaxCache` for reproducible development caches and disposable test browser profiles on this machine.
