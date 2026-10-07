# Easy W-4 · PWABuilder handoff

Prepared October 6, 2026. No store submission or GitHub publication has been performed.

The store app includes Calculator and Help only. Annual data is maintained in the JSON files and shipped in new releases; no tax-table editor is exposed to users.

## Files

- Repository ZIP: source, tests, root index.html, and GitHub Pages workflow. Excludes original spreadsheets, analysis, private signing keys, generated media tooling, and Git history.
- Website ZIP: contents of dist with index.html at ZIP root. Extract on the HTTPS host before using PWABuilder.
- Store media: separate google-play and windows-store folders, with fictional example inputs only.

## Store media

Google Play: store-icon-512.png (512 square), feature-graphic-1024x500.png, four phone screenshots (525 × 922), and Easy-W4-trailer-1080p.mp4. Phone shots meet the minimum dimensions; they are browser-rendered responsive views, not Android package certification captures. Verify appearance in the PWABuilder Android package. Upload the trailer to YouTube as public or unlisted, with ads disabled and embedding enabled; place the video URL in Play Console. It is not a direct MP4 upload to Play Console.

Windows: store-icon-300.png (300 square), four desktop screenshots (1905 × 1017), trailer-thumbnail-1920x1080.png, hero-art-1920x1080.png (no text), and Easy-W4-trailer-1080p.mp4. The trailer is a 28-second captioned screenshot walkthrough, H.264 High, 30 fps, 1920 × 1080, yuv420p, AAC stereo 48 kHz, with a silent audio track. It has no narration or licensed music. Title: Easy W-4 — Plan your paycheck.

## Listing copy

Short description: Explore paycheck, W-4, and annual tax estimates across up to four jobs.

Description: Easy W-4 brings household income, payroll deductions, and withholding choices together. Enter up to four jobs, explore shared W-4 reference balances, compare estimated take-home pay, and see an estimated year-end federal and state balance. A built-in guide explains the inputs and includes a two-job example. Entries save locally by tax year; export a file for backup or transfer. Federal W-4 and state withholding controls are separate. Calculations use the loaded annual data and simplified rules. This is a planning tool, not a tax return or a guarantee of employer withholding.

Screenshot captions (also usable as alt text):
1. Enter household details and compare estimated paycheck deductions.
2. Explore income allocation across W-4s for multiple jobs.
3. Compare estimated state withholding with annual state tax.
4. Read step-by-step instructions and a worked example.
Google phone order: household, jobs, W-4 balances, tax-time results.

## Before submitting

1. Host the website on HTTPS and use its real public URL in PWABuilder. Preserve existing store identities and signing keys for updates. Use a higher package version; this handoff does not alter your existing signed packages.
2. Publish privacy.html and supply your developer/support contact in both store listings. Review privacy text against the final hosted wrapper and hosting provider. Complete each store's data declarations based on the actual packaged app.
3. Test PWABuilder's generated Android and Windows packages, including local-save restoration, export/import, external IRS links, responsive layout, and screenshots. These browser screenshots do not substitute for testing the native wrappers.
4. Complete the documented tax-model review before presenting this as a production tax calculator: imported state datasets and advanced credits/deductions are still marked for review. Passing regression tests does not certify tax-law accuracy. Multi-state taxation and midyear catch-up withholding are not implemented.
5. Preserve the app's limitations and the IRS instruction link in the final product. The shared-allocation example demonstrates this calculator; IRS multiple-job instructions place Steps 3–4(b) on one W-4, preferably the highest-paying job.

## Official references checked

- Microsoft store assets: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/screenshots-and-images
- Google preview assets: https://support.google.com/googleplay/android-developer/answer/9866151?hl=en
- PWA icons: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons
- IRS W-4: https://www.irs.gov/pub/irs-pdf/fw4.pdf

## Advertising update

Optional AdSense is prepared with the existing publisher account and a verification meta tag. The supplied Easy W-4 display slot 9809430962 is configured. The production hostname cschnacker.github.io is configured. Ads are currently disabled pending AdSense site approval and consent setup. Complete ADVERTISING.md before activation. Windows wrappers require the ad-free deployment or ads=off start parameter until a supported monetization method is configured. If enabled for the website/Android TWA, update the store ad and data declarations and test the consent flow.
