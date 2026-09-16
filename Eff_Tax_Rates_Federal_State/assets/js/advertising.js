(function () {
    "use strict";
    var config = window.taxAdsConfig || {};
    var container = document.getElementById("calculator-ad");
    if (!container || config.enabled !== true ||
        !/^ca-pub-\d{16}$/.test(config.publisherId) ||
        !/^\d+$/.test(config.slotId) || navigator.onLine === false) return;
    var requested = false;
    function showAd() {
        if (requested) return;
        container.hidden = false;
        // jQuery Mobile initially hides pages; wait for a visible width.
        if (container.getBoundingClientRect().width < 100) {
            container.hidden = true;
            return;
        }
        requested = true;
        var ad = container.querySelector("ins");
        ad.setAttribute("data-ad-client", config.publisherId);
        ad.setAttribute("data-ad-slot", config.slotId);
        var script = document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
        if (!script) {
            script = document.createElement("script");
            script.async = true;
            script.crossOrigin = "anonymous";
            script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + config.publisherId;
            script.addEventListener("error", function () { container.hidden = true; });
            document.head.appendChild(script);
        } else {
            script.addEventListener("error", function () { container.hidden = true; });
        }
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
        catch (error) { container.hidden = true; }
    }
    if (window.jQuery) window.jQuery(document).on("pageshow", "#home", showAd);
    window.addEventListener("load", showAd);
    window.addEventListener("resize", showAd);
    showAd();
}());
