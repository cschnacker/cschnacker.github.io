# AdSense

The AdSense script is included in index.html using the same publisher as the Federal/State app: ca-pub-5436594780163482.

A responsive manual placement below the guide is prepared. The existing configuration has no ad-unit slot ID, so that placement remains hidden. To activate it, enter your display ad unit's numeric slotId in assets/js/ads-config.js and set enabled to true. Account-controlled Auto ads use the head script independently.

Ad delivery depends on your AdSense account and site configuration. No account settings were changed by this conversion. Third-party ad requests are excluded from the app's offline cache.

When changing bundled files (including ads-config.js), increment the version suffix in serviceworker.js so installed copies receive the update.
