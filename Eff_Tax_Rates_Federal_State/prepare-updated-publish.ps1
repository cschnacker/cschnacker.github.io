$target = 'E:\ProgressiveWebApps\EffectiveTaxModel'
$source = 'C:\inetpub\wwwroot\PWA\Eff_Tax_Rates_Federal_State'
$publish = Join-Path $target 'github-publish'
if (Test-Path -LiteralPath $publish) { throw 'Publishing folder already exists; refusing to overwrite.' }
$htmlPath = Join-Path $target 'model.html'
$html = [IO.File]::ReadAllText($htmlPath)
if ($html.Contains('calculator-ad')) { throw 'Model already has an ad integration; inspect before proceeding.' }
$head = @"
<link rel="manifest" href="model.webmanifest">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5436594780163482" crossorigin="anonymous"></script>
<link rel="stylesheet" href="assets/css/advertising.css">
<script defer src="assets/js/ads-config.js"></script>
<script defer src="assets/js/advertising.js"></script>
"@
$ad = @"
<aside id="calculator-ad" class="calculator-ad" aria-label="Advertisement" hidden>
<div class="calculator-ad-label">Advertisement</div>
<ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="false"></ins>
</aside>
"@
$registration = @"
<script>
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('serviceworker.js').catch(function (error) {
    console.warn('Offline support unavailable:', error);
  });
}
</script>
"@
$html = $html.Replace('</head>', $head + "`n</head>").Replace('</main>', $ad + "`n</main>").Replace('</body>', $registration + "`n</body>")
[IO.File]::WriteAllText($htmlPath, $html)
Copy-Item -LiteralPath (Join-Path $source 'assets/js/ads-config.js'),(Join-Path $source 'assets/js/advertising.js') -Destination (Join-Path $target 'assets/js')
$css = [IO.File]::ReadAllText((Join-Path $source 'assets/css/advertising.css'))
$css = $css.Replace('max-width: 391px;', 'max-width: 100%; grid-column: 1 / -1; order: 4;')
[IO.File]::WriteAllText((Join-Path $target 'assets/css/advertising.css'), $css)
Copy-Item -LiteralPath (Join-Path $source 'serviceworker.js') -Destination $target
$manifest = [ordered]@{name='Effective Tax';short_name='Effective Tax';start_url='./model.html';scope='./';display='standalone';theme_color='#165d9c';background_color='#f4f7fb';icons=@(@{src='tax-day512x512.png';sizes='512x512';type='image/png';purpose='any'})}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $target 'model.webmanifest')
New-Item -ItemType Directory -Path (Join-Path $publish 'assets/js'),(Join-Path $publish 'assets/css') | Out-Null
$publishHtml = $html.Replace('<footer><a href="index.html">Open original calculator</a></footer>', '')
[IO.File]::WriteAllText((Join-Path $publish 'index.html'), $publishHtml)
foreach ($file in @('tax-data.js','model-engine.js','model.js','ads-config.js','advertising.js')) {
  Copy-Item -LiteralPath (Join-Path $target "assets/js/$file") -Destination (Join-Path $publish 'assets/js')
}
foreach ($file in @('model.css','advertising.css')) {
  Copy-Item -LiteralPath (Join-Path $target "assets/css/$file") -Destination (Join-Path $publish 'assets/css')
}
Copy-Item -LiteralPath (Join-Path $target 'tax-day512x512.png'),(Join-Path $target 'serviceworker.js') -Destination $publish
$manifest.start_url = './index.html'
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $publish 'model.webmanifest')
New-Item -ItemType File -Path (Join-Path $publish '.nojekyll') | Out-Null
@"
# Publishing the updated calculator

Open model.html for the updated local application. The original index.html is preserved.
Upload the CONTENTS of github-publish to your GitHub Pages repository root.
That folder uses the updated model as index.html and excludes the original calculator.
The manifest uses relative URLs so the installed PWA opens the updated app.

AdSense publisher: ca-pub-5436594780163482. The account script is included.
The manual ad placement remains disabled until a display ad-unit slot ID is provided.
Configure ads-config.js in the source and publishing copy when enabling the unit.
Complete site approval and applicable privacy/consent setup in AdSense first.
Keep Auto ads off if you want only the manually placed ad below the calculator.
Publish your account's ads.txt at https://cschnacker.github.io/ads.txt in the root site repository.
Nothing has been uploaded to GitHub by this preparation step.
"@ | Set-Content (Join-Path $target 'ADVERTISING.md')
Write-Output "Updated model.html and prepared $publish"
