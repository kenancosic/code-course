Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot "server"
$venvDir = Join-Path $serverDir "venv"
$pythonExe = Join-Path $venvDir "Scripts\\python.exe"

if (-not (Test-Path $venvDir)) {
    Write-Host "Creating backend virtual environment..."
    py -3.11 -m venv $venvDir
}

if (-not (Test-Path $pythonExe)) {
    throw "Backend virtual environment is missing python.exe at $pythonExe"
}

if (-not (Test-Path (Join-Path $repoRoot ".env")) -and (Test-Path (Join-Path $repoRoot ".env.example"))) {
    Copy-Item (Join-Path $repoRoot ".env.example") (Join-Path $repoRoot ".env")
}

if (-not (Test-Path (Join-Path $serverDir ".env")) -and (Test-Path (Join-Path $serverDir ".env.example"))) {
    Copy-Item (Join-Path $serverDir ".env.example") (Join-Path $serverDir ".env")
}

Write-Host "Installing backend dependencies..."
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r (Join-Path $serverDir "requirements.txt")

Write-Host "Applying database migrations..."
Push-Location $serverDir
try {
    & $pythonExe -m alembic upgrade head
    & $pythonExe -m seed.seed_roadmaps
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Local setup is ready."
Write-Host "Start backend with: powershell -ExecutionPolicy Bypass -File .\\scripts\\run-backend.ps1"
Write-Host "Start frontend with a Vite command after installing pnpm if needed."
