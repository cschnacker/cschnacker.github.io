$ErrorActionPreference = 'Stop'
$bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $bundled) { $node = $bundled } else { $node = (Get-Command node -ErrorAction Stop).Source }
$major = [int]((& $node --version).TrimStart('v').Split('.')[0])
if ($major -lt 18) { throw 'Install Node.js 18 or later to run the local server.' }
try { $response = Invoke-WebRequest 'http://127.0.0.1:4173' -UseBasicParsing -TimeoutSec 2 } catch { $response = $null }
if ($response -and $response.Content -notmatch 'SchnackerSoftwareSolutions') { throw 'Port 4173 is occupied by another app.' }
if (-not $response) {
  Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $PSScriptRoot 'server.mjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($attempt=0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    try { $response = Invoke-WebRequest 'http://127.0.0.1:4173' -UseBasicParsing -TimeoutSec 1; break } catch { }
  }
}
if (-not $response) { throw 'The Budget Planner server did not start.' }
Start-Process 'http://127.0.0.1:4173'
