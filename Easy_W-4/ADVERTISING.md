# Easy W-4 AdSense setup

The same publisher account as the Effective Tax Rate Calculator is configured: ca-pub-5436594780163482. The HTML includes Google's publisher verification meta tag. This verifies account ownership when reviewed by Google; it does not load advertising code or confirm approval. The Easy W-4 — Bottom display ad unit is configured with slot ID 9809430962. The production hostname cschnacker.github.io is configured. Live ads remain disabled until AdSense site approval and the consent setup are confirmed.

## Activate

1. Host the app on HTTPS. In AdSense Sites, confirm that the actual production site is Ready. A publisher ID can serve multiple approved sites; it is not itself site approval.
2. The responsive Display unit supplied for Easy W-4 is already configured in app/data/ads.json (slotId 9809430962). Confirm this unit appears in your AdSense account.
3. Add the actual hosting hostname to approvedHostnames in that JSON (for example cschnacker.github.io, without a protocol or path). This list is a local deployment guard, not Google's approval list. HTTP and localhost do not request ads.
4. Publish the privacy page and configure the applicable consent messages in AdSense Privacy & messaging, or a supported certified CMP. Set consentManagementReady to true only once that setup is ready. This flag records your deployment configuration; it does not create a CMP or stand in for user consent. Google requires a certified CMP for personalized ads in the EEA, UK, and Switzerland.
5. Put the supplied ads.txt line at the root of the actual production hostname. For a GitHub project site, a file at /your-repository/ads.txt is not the hostname root. Copy the line into the root site's ads.txt (e.g. https://cschnacker.github.io/ads.txt), preserving other existing entries.
6. Set enabled to true, run npm test and npm run build, then deploy. If you want only the manual placement, keep Auto ads disabled in your AdSense account. Account-controlled Auto ads may add other placements when the library loads.

The ad appears once below the calculator, labeled Advertisement. Recalculating or switching jobs does not refresh the ad. Config/download failures, disabled ads, missing IDs, or detected unsupported WebViews leave the calculator working without an ad. The integration receives no calculator input or result objects.

## PWABuilder apps

Google lists Android Trusted Web Activities and Chrome Custom Tabs as supported viewing frames for AdSense. Use PWABuilder's Android TWA path and verify the resulting package. An Android WebView needs Google's WebView API for Ads registration; that native SDK integration is not included here. Detected Android WebViews and Windows WebView2 do not load this script. For Windows packaging, use a deployment with enabled=false or set the Windows start URL to include ?ads=off as well. Browser detection alone is not a guarantee of wrapper eligibility; verify the actual package technology before enabling ads. Native app ads may require a separate provider/SDK and revised store declarations.

Public identifiers belong in this configuration; do not add passwords or account tokens. Setting enabled=false stops this app's loader. The publisher verification meta tag makes no ad request. Keep store advertising/data declarations aligned with the final deployed app and consent behavior.

Official sources:
- Site approval and meta verification: https://support.google.com/adsense/answer/12169212?hl=en
- Supported app frames: https://support.google.com/admanager/answer/6310245?hl=en
- Consent requirements: https://support.google.com/adsense/answer/13554116?hl=en
- Responsive code: https://support.google.com/adsense/answer/9183460?hl=en
