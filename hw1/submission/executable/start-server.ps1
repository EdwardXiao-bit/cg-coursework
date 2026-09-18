# HW1 one-click local server launcher (PowerShell version of start-server.bat)
# Usage: open PowerShell in this folder and run  .\start-server.ps1
# If script execution is blocked, run first:
#     Set-ExecutionPolicy -Scope Process Bypass

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HW1 - Interactive 2D Drawing (Fractal)"     -ForegroundColor Cyan
Write-Host "  Starting local server ..."                  -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
$node   = Get-Command node   -ErrorAction SilentlyContinue

if ($python) {
    Write-Host "[info] using Python; the browser will open automatically" -ForegroundColor Green
    Write-Host "[info] press Ctrl+C to stop the server" -ForegroundColor Yellow
    Start-Process "http://localhost:8000/hw1Code/hw1.html"
    & python -m http.server 8000
}
elseif ($node) {
    Write-Host "[info] Python not found, using Node.js" -ForegroundColor Green
    Write-Host "[info] press Ctrl+C to stop the server" -ForegroundColor Yellow
    Start-Process "http://localhost:8000/hw1Code/hw1.html"
    & npx --yes http-server -p 8000
}
else {
    Write-Host "[error] Neither Python nor Node.js was found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please do ONE of the following:"
    Write-Host "  1. Install Python 3 : https://www.python.org/downloads/"
    Write-Host "  2. Install Node.js  : https://nodejs.org/"
    Write-Host "  3. Open this folder in VS Code, install the Live Server"
    Write-Host "     extension, then right-click hw1Code\hw1.html and"
    Write-Host "     choose Open with Live Server"
}
