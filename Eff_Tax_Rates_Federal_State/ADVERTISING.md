# Google AdSense setup

One responsive display ad appears below the calculator, labeled Advertisement. The manual placement remains hidden until configured. Google's account verification script now loads independently in index.html with publisher ID ca-pub-5436594780163482. Calculation code is unchanged.

1. Publish the updated index.html to GitHub Pages, then complete ownership verification and site review in AdSense. The supplied verification script is already included in the page head.
2. Create a responsive Display ad unit. Copy its `data-ad-client` (ca-pub- followed by 16 digits) and `data-ad-slot` into `publisherId` and `slotId` in `assets/js/ads-config.js`.
3. Publish privacy disclosures and configure applicable consent messages in AdSense Privacy & messaging before enabling ads. Personalized ads in the EEA, UK and Switzerland require a Google-certified CMP. This integration does not implement a CMP. See https://support.google.com/adsense/answer/13554116
4. Copy your account's ads.txt entry to the production hostname's `/ads.txt`. For the hostname in manifest.json, this is `https://cschnacker.github.io/ads.txt`, managed in the root site repository, not this project's subfolder. Use the root of your actual production hostname if different. Do not publish placeholder IDs. See https://support.google.com/adsense/answer/12171612
5. Once the site and consent setup are ready, set `enabled: true` in `assets/js/ads-config.js` and deploy the changed files. Keep AdSense Auto ads disabled if you want only this placement.
6. Reload after the updated service worker activates; close other app tabs if necessary. Check mobile/desktop layout, consent messages, calculator results, offline use and ad blocking. Never click your own ads. Google may leave a slot unfilled.

Set `enabled: false` to disable the manual placement. Blank/invalid IDs also disable it. This does not disable the head script or account-controlled Auto ads; remove the head script and disable Auto ads to stop all advertising loading. These IDs are public identifiers; do not put account secrets in these files.

Ad requests bypass the updated offline cache. Responsive parameters follow https://support.google.com/adsense/answer/9183460. Full-width expansion is disabled to keep ads inside the calculator column.
