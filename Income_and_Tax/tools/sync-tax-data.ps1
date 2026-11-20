param(
  [Parameter(Mandatory=$true)][string]$Source
)
$ErrorActionPreference = 'Stop'
$raw = Get-Content -Raw -LiteralPath $Source
$json = $raw -replace '^\s*/\*[\s\S]*?\*/\s*', '' -replace '^\s*window\.TaxData\s*=\s*', '' -replace ';\s*$', ''
$data = $json | ConvertFrom-Json
if ($data.schemaVersion -ne 1 -or -not ($data.year -is [int] -or $data.year -is [long]) -or
    $data.year -lt 1900 -or -not $data.releaseId -or -not $data.federal -or -not $data.states) {
  throw 'Expected a version 1 Effective Tax Rate Fed/State release.'
}
$destination = Join-Path $PSScriptRoot "../data/tax-$($data.year).json"
[IO.File]::WriteAllText($destination, $json.Trim() + [Environment]::NewLine)
Write-Output "Synced $($data.releaseId) to $destination. Match its year and releaseId in the planner supplement."
