# One-click local server launcher for a homework package (hw1 / hw2 / ...).
# PowerShell version of start-server.bat.
# Usage: open PowerShell in this folder and run  .\start-server.ps1
# If script execution is blocked, run first:
#     Set-ExecutionPolicy -Scope Process Bypass
#
# It auto-detects the *Code folder and its entry .html page, so the same
# script works whatever homework the package was built from.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$codeDir = Get-ChildItem -Directory -Filter "*Code" | Select-Object -First 1
$html = $null
if ($codeDir) {
    $html = Get-ChildItem -Path $codeDir.FullName -Filter "*.html" -File | Select-Object -First 1
}
if (-not $html) {
    Write-Host "[error] Cannot find a *Code folder containing an .html page here." -ForegroundColor Red
    Write-Host "        Please unzip the whole package and run this script again."
    exit 1
}

$url = "http://localhost:8000/" + $codeDir.Name + "/" + $html.Name

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CG homework - interactive WebGL demo"       -ForegroundColor Cyan
Write-Host ("  Page: " + $codeDir.Name + "/" + $html.Name) -ForegroundColor Cyan
Write-Host "  Starting local server ..."                  -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
$node   = Get-Command node   -ErrorAction SilentlyContinue

if ($python) {
    Write-Host "[info] using Python; the browser will open automatically" -ForegroundColor Green
    Write-Host "[info] press Ctrl+C to stop the server" -ForegroundColor Yellow
    Start-Process $url
    & python -m http.server 8000
}
elseif ($node) {
    Write-Host "[info] Python not found, using Node.js" -ForegroundColor Green
    Write-Host "[info] press Ctrl+C to stop the server" -ForegroundColor Yellow
    Start-Process $url
    & npx --yes http-server -p 8000
}
else {
    Write-Host "[error] Neither Python nor Node.js was found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please do ONE of the following:"
    Write-Host "  1. Install Python 3 : https://www.python.org/downloads/"
    Write-Host "  2. Install Node.js  : https://nodejs.org/"
    Write-Host "  3. Open this folder in VS Code, install the Live Server"
    Write-Host "     extension, then right-click the .html page in the *Code"
    Write-Host "     folder and choose Open with Live Server"
}
