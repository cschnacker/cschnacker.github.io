# Loan Planner

A static loan planner with monthly amortization, yearly and monthly payment
tables, a balance graph, and stacked payment breakdowns. No build step or server
database is required.

## Upload to GitHub

1. Extract `Loan-GitHub-upload.zip` on your computer. Upload the **extracted
   contents**, not the ZIP itself.
2. For a dedicated Loan Planner repository, put the contents at the repository
   root. For an existing website repository, put them in its `Loan/` folder.
   Keep the `data/` and `js/` folders and their filenames intact.
3. Commit the files to the intended branch.
4. If using GitHub Pages, select that branch and its website source folder in
   **Settings → Pages**. This app runs directly from static files; it does not
   need an npm build or deployment workflow.
5. Open the published URL and check the planner. In an existing site, open its
   `Loan/` path. GitHub Pages publishes only the configured website source.

`.nojekyll` is included for a plain static GitHub Pages site. If integrating into
an existing Jekyll website, retain that repository's existing publishing setup.

## Included files

- `index.html`, `styles.css`: interface.
- `js/`, `data/`: calculations, saving, portable plan files, controls, defaults.
- `manifest.json`, `serviceworker.js`, `loan550x550.png`: installed/offline app.
- `update.html`: activate a complete cached app update without clearing inputs.
- `tests/`, `package.json`: automated calculation, storage, and transfer checks.
- `MAINTENANCE.txt`: implementation and update notes.
- `.gitignore`, `.nojekyll`, this README: repository setup and documentation.

Backups, screenshots, the original workbook, downloaded loan plans, and browser
data are excluded from the upload package. No AdSense or analytics code is
included.

## User data and moving to the published site

Entries save automatically in the current browser on the current site address.
The GitHub Pages address has its own storage; it cannot read entries saved at
`localhost`. Use **Download plan** on the old address, then **Upload plan** on the
new address to transfer entries and future loan changes. Keep personal plan JSON
files out of the repository. Payment CSV downloads are reports, not importable
plans.

## Local preview and checks

Use a static HTTP server rather than opening `index.html` directly as a file.
For example, with Python installed:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. With a current Node.js version:

```sh
npm test
```

No npm dependencies need to be installed.

## Updates

Deploy the app files together and increment `VERSION` in `serviceworker.js`.
Installed copies cache an entire app version. Close and reopen all Loan Planner
tabs to activate an update, or visit `update.html` on the same site. Updates do
not clear saved inputs. Defaults, user storage, calculations, and interface code
are separate; no annual reference-data update is required.
