# One-click local server launcher for a homework package (hw1 / hw2 / ...).
# Required because the page loads shader files with synchronous AJAX,
# which browsers block under the file:// protocol.
#
# Auto-detects the *Code folder and its entry .html page, reuses an already
# running server for the same page, otherwise picks a free port (8000..8010),
# waits until the page really answers HTTP 200, and only then opens the browser.

$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

function Pause-Exit {
    param([int]$Code = 0)
    Read-Host 'Press Enter to close'
    exit $Code
}

$codeDir = Get-ChildItem -LiteralPath $PSScriptRoot -Directory -Filter '*Code' |
    Select-Object -First 1
if (-not $codeDir) {
    Write-Host '[error] Cannot find a *Code folder here.' -ForegroundColor Red
    Write-Host '        Run this script inside the unzipped package, in the same'
    Write-Host '        folder as the *Code folder (e.g. executable\).'
    Pause-Exit 1
}

$page = Get-ChildItem -LiteralPath $codeDir.FullName -Filter '*.html' -File |
    Select-Object -First 1
if (-not $page) {
    Write-Host "[error] No .html page found in $($codeDir.Name)." -ForegroundColor Red
    Pause-Exit 1
}

$rel = "$($codeDir.Name)/$($page.Name)"

function Test-UrlServes {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $Url
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-FreePort {
    foreach ($p in 8000..8010) {
        try {
            $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $l.Start()
            $l.Stop()
            return $p
        } catch {
            continue
        }
    }
    return 8000
}

# Reuse a server that already serves this exact page.
$existing = "http://localhost:8000/$rel"
if (Test-UrlServes -Url $existing) {
    Write-Host "[info] a server is already running on port 8000 and serves this page."
    Write-Host "[ok] opening $existing"
    Start-Process $existing
    exit 0
}

$port = Get-FreePort
$url = "http://localhost:$port/$rel"

Write-Host '============================================'
Write-Host '  CG homework - interactive WebGL demo'
Write-Host "  Page : $rel"
Write-Host "  URL  : $url"
Write-Host '============================================'
Write-Host ''

$server = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "[info] starting Python http.server on port $port ..."
    $server = @{ Exe = 'python'; Args = @('-m', 'http.server', "$port") }
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    Write-Host "[info] starting Python launcher http.server on port $port ..."
    $server = @{ Exe = 'py'; Args = @('-m', 'http.server', "$port") }
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "[info] Python not found, starting Node http-server on port $port ..."
    $server = @{ Exe = 'npx'; Args = @('--yes', 'http-server', '-p', "$port") }
} else {
    Write-Host '[error] Neither Python nor Node.js was found.' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Please do ONE of the following:'
    Write-Host '  1. Install Python 3 : https://www.python.org/downloads/'
    Write-Host '  2. Install Node.js  : https://nodejs.org/'
    Write-Host '  3. Open this folder in VS Code, install the "Live Server"'
    Write-Host '     extension, then right-click the .html page in the *Code folder'
    Write-Host '     and choose "Open with Live Server".'
    Pause-Exit 1
}

Start-Process -FilePath $server.Exe -ArgumentList $server.Args -WorkingDirectory $PSScriptRoot |
    Out-Null

Write-Host "[info] waiting for $url to answer HTTP 200 ..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    if (Test-UrlServes -Url $url) { $ready = $true; break }
    Start-Sleep -Milliseconds 250
}

if (-not $ready) {
    Write-Host "[warn] $url did not answer HTTP 200." -ForegroundColor Yellow
    Write-Host '       The URL above is what the browser will open: check it by hand.'
    Write-Host '       If the port was taken by another program, close it and retry.'
    Pause-Exit 1
}

Write-Host "[ok] page is served, opening $url"
Start-Process $url
exit 0
