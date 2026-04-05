Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot "server\\venv\\Scripts\\python.exe"

if (-not (Test-Path $pythonExe)) {
    throw "Backend virtual environment is missing. Run .\\scripts\\setup-local.ps1 first."
}

Push-Location $repoRoot
try {
    $env:PYTHONPATH = $repoRoot
    & $pythonExe -m uvicorn server.main:app --reload --port 8000
}
finally {
    Pop-Location
}
