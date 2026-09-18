param(
    [string]$Hw = "hw1"
)

$ErrorActionPreference = "Stop"

# Repo root = parent of this script's folder (script lives in <repo>/tools/)
$repo = Split-Path $PSScriptRoot -Parent
$hwDir = Join-Path $repo $Hw
if (-not (Test-Path $hwDir)) { throw "Homework folder not found: $hwDir" }

$srcCode   = Join-Path $hwDir "hw1Code"
$srcReport = Join-Path $hwDir "report"
$sub       = Join-Path $hwDir "submission"

if (-not (Test-Path $srcCode))   { throw "Source folder not found: $srcCode" }
if (-not (Test-Path $srcReport)) { throw "Report folder not found: $srcReport" }

if (Test-Path $sub) { Remove-Item $sub -Recurse -Force }
New-Item -ItemType Directory -Path $sub -Force | Out-Null

# --- 1. source code (only the files worth reading) ---
$srcDir = Join-Path $sub "source"
New-Item -ItemType Directory -Path (Join-Path $srcDir "shaders") -Force | Out-Null
Copy-Item (Join-Path $srcCode "hw1.html")  $srcDir -Force
Copy-Item (Join-Path $srcCode "hw1.js")    $srcDir -Force
Copy-Item (Join-Path $srcCode "shaders\*") (Join-Path $srcDir "shaders") -Force

# --- 2. runnable program: two identical copies, one ASCII name one Chinese name ---
#     (real copies rather than junctions so any unzip tool works)
$exeDirs = @((Join-Path $sub "executable"), (Join-Path $sub ([char]0x53EF + [char]0x6267 + [char]0x884C + [char]0x7A0B + [char]0x5E8F)))
foreach ($d in $exeDirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
    Copy-Item $srcCode (Join-Path $d "hw1Code") -Recurse -Force
    Copy-Item (Join-Path $PSScriptRoot "start-server.bat") $d -Force
    Copy-Item (Join-Path $PSScriptRoot "start-server.ps1") $d -Force
}

# --- 3. readme ---
Copy-Item (Join-Path $hwDir "readme.md") $sub -Force

# --- 4. report + demo video ---
Copy-Item (Join-Path $srcReport "*.docx") $sub -Force
Copy-Item (Join-Path $srcReport "*.mp4")  $sub -Force

# --- 5. zip for uploading ---
$zip = Join-Path $sub "submit.zip"
Compress-Archive -Path (Join-Path $sub "*") -DestinationPath $zip -CompressionLevel Optimal -Force

Write-Host ""
Write-Host "Submission package contents:"
Get-ChildItem $sub -Recurse -Force | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Replace("$sub\", "")
    if ($_.PSIsContainer) {
        Write-Host ("         DIR  " + $rel)
    } else {
        Write-Host (([string]$_.Length).PadLeft(12) + "  " + $rel)
    }
}
Write-Host ""
Write-Host ("zip : " + $zip)
Write-Host ("size: " + [math]::Round((Get-Item $zip).Length / 1MB, 2) + " MB")
Write-Host ""
Write-Host "Upload this zip to Yuketang."
