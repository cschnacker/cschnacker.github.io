# Effective Tax Rate

A standalone, responsive calculator using user-entered taxable income, upper bracket limits, and percentage rates. Supports one flat rate or up to 14 progressive brackets. No tax tables or separate data file are required.

Serve this directory over HTTPS (or localhost for testing). Open index.html. The manifest and service worker support installation and offline use. Calculations also work without installation. No build step or runtime dependencies are needed.

Remember my entries is optional and stores inputs in this browser's localStorage. Clear entries removes the app's saved inputs. Original SpreadsheetConverter assets are retained but are no longer loaded. The legacy-backup directory contains the original entry files.

Update the serviceworker.js cache version whenever changing bundled files. The worker only removes this app's own older caches and does not cache third-party advertisements. See ADVERTISING.md for the included AdSense configuration.
