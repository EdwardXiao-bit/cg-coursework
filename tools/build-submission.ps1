param(
    [string]$Hw = "hw1",
    # 提交包名字，默认与作业目录同名（hw1 -> HW1.zip）
    [string]$ZipName = "",
    # 是否把演示视频一并放进提交包（默认不放，视频体积大且非必需）
    [switch]$IncludeVideo
)

$ErrorActionPreference = "Stop"

# Repo root = parent of this script's folder (script lives in <repo>/tools/)
$repo = Split-Path $PSScriptRoot -Parent
$hwDir = Join-Path $repo $Hw
if (-not (Test-Path $hwDir)) { throw "Homework folder not found: $hwDir" }

# hw1 -> hw1Code, hw2 -> hw2Code ... 自动推导，换作业不用改脚本
$codeName  = $Hw + "Code"
$srcCode   = Join-Path $hwDir $codeName
$srcReport = Join-Path $hwDir "report"
$sub       = Join-Path $hwDir "submission"

if (-not $ZipName) { $ZipName = $Hw.ToUpper() + ".zip" }

if (-not (Test-Path $srcCode))   { throw "Source folder not found: $srcCode" }
if (-not (Test-Path $srcReport)) { throw "Report folder not found: $srcReport" }

if (Test-Path $sub) { Remove-Item $sub -Recurse -Force }
New-Item -ItemType Directory -Path $sub -Force | Out-Null

# --- 1. source code (only the files worth reading) ---
$srcDir = Join-Path $sub "source"
New-Item -ItemType Directory -Path (Join-Path $srcDir "shaders") -Force | Out-Null
Copy-Item (Join-Path $srcCode ($Hw + ".html")) $srcDir -Force
Copy-Item (Join-Path $srcCode ($Hw + ".js"))   $srcDir -Force
Copy-Item (Join-Path $srcCode "shaders\*")     (Join-Path $srcDir "shaders") -Force

# --- 2. runnable program: two identical copies, one ASCII name one Chinese name ---
#     (real copies rather than junctions so any unzip tool works)
$exeDirs = @((Join-Path $sub "executable"), (Join-Path $sub ([char]0x53EF + [char]0x6267 + [char]0x884C + [char]0x7A0B + [char]0x5E8F)))
foreach ($d in $exeDirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
    Copy-Item $srcCode (Join-Path $d $codeName) -Recurse -Force
    Copy-Item (Join-Path $PSScriptRoot "start-server.bat") $d -Force
    Copy-Item (Join-Path $PSScriptRoot "start-server.ps1") $d -Force
}

# --- 3. readme ---
Copy-Item (Join-Path $hwDir "readme.md") $sub -Force

# --- 4. report (+ demo video, optional) ---
Copy-Item (Join-Path $srcReport "*.docx") $sub -Force
if ($IncludeVideo) {
    Copy-Item (Join-Path $srcReport "*.mp4") $sub -Force
    Write-Host "[info] demo video included (-IncludeVideo)"
} else {
    Write-Host "[info] demo video excluded (add -IncludeVideo to include it)"
}

# --- 5. zip for uploading ---
# 用 .NET ZipArchive 手工打包，而不是 Compress-Archive，原因有三：
#   a) PowerShell 5.1 的 Compress-Archive 把条目名写成反斜杠 executable\hw1Code\...
#      （解压到 macOS/Linux 时不会被当成目录分隔符），这里统一写成正斜杠 /；
#   b) 条目名用 UTF-8 且正确置位语言标志位（写法上有坑，见下面构造函数处的注释），
#      中文目录名 可执行程序/ 在解压时不会乱码；
#   c) 统一加一层顶层目录 HW1/，解压后是一个干净的 HW1/ 文件夹，
#      而不是把 source/ executable/ 等直接散落在解压目录里。
$zip = Join-Path $sub $ZipName
$pkgName = $Hw.ToUpper()                      # hw1 -> HW1

# 先清掉旧的 zip：避免把已存在的压缩包也打进去（嵌套）
Get-ChildItem $sub -Filter "*.zip" -File | Remove-Item -Force

Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

$zipStream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
try {
    # 刻意用 3 参数构造，让 entryNameEncoding 保持 null。
    # 实测（.NET Framework / PowerShell 5.1）：显式传 UTF8Encoding 反而**不会**设置
    # zip 的 UTF-8 语言标志位（general purpose bit 11，实测 flag=0x0000），
    # 条目名会被按系统代码页(GBK)解读，可执行程序/ 变成 鍙墽琛岀▼搴?/ 而乱码；
    # 留空时 .NET 对含非 ASCII 的条目名自动用 UTF-8 并置位该标志（flag=0x0800）。
    $archive = New-Object System.IO.Compression.ZipArchive(
        $zipStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false)
    try {
        [void]$archive.CreateEntry($pkgName + "/")
        foreach ($item in (Get-ChildItem $sub -Recurse -Force | Sort-Object FullName)) {
            if ($item.FullName -eq $zip) { continue }        # 不要把正在写的 zip 打进去
            if ($item.PSIsContainer) {
                $rel = $item.FullName.Substring($sub.Length + 1).Replace("\", "/")
                [void]$archive.CreateEntry($pkgName + "/" + $rel + "/")
            } elseif ($item.Extension -ne ".zip") {
                $rel   = $item.FullName.Substring($sub.Length + 1).Replace("\", "/")
                $entry = $archive.CreateEntry($pkgName + "/" + $rel, [System.IO.Compression.CompressionLevel]::Optimal)
                $outS  = $entry.Open()
                try {
                    $inS = [System.IO.File]::OpenRead($item.FullName)
                    try { $inS.CopyTo($outS) } finally { $inS.Dispose() }
                } finally { $outS.Dispose() }
            }
        }
    } finally { $archive.Dispose() }
} finally { $zipStream.Dispose() }

# --- 6. report what actually landed in the zip (读回来核对，而不是只看暂存目录) ---
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zipEntries = @()
$zr = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
    $zipEntries = @($zr.Entries | ForEach-Object {
        [pscustomobject]@{ Name = $_.FullName; Size = $_.Length }
    })
} finally { $zr.Dispose() }

Write-Host ""
Write-Host ("Submission package: " + $ZipName + "    (top folder inside zip: " + $pkgName + "/)")
Write-Host "Contents:"
$zipEntries | Sort-Object Name | ForEach-Object {
    if ($_.Name.EndsWith("/")) {
        Write-Host ("         DIR  " + $_.Name)
    } else {
        Write-Host (([string]$_.Size).PadLeft(12) + "  " + $_.Name)
    }
}

$nestedZips = @($zipEntries | Where-Object { $_.Name -like "*.zip" })
$videos     = @($zipEntries | Where-Object { $_.Name -like "*.mp4" })
Write-Host ""
Write-Host ("entries    : " + $zipEntries.Count)
Write-Host ("nested zip : " + $(if ($nestedZips.Count) { "FOUND " + $nestedZips.Count + " (BAD)" } else { "none" }))
Write-Host ("demo video : " + $(if ($videos.Count) { "included (" + $videos.Count + ")" } else { "excluded" }))
Write-Host ("zip        : " + $zip)
Write-Host ("size       : " + [math]::Round((Get-Item $zip).Length / 1MB, 2) + " MB")
Write-Host ""
Write-Host "Upload this zip to Yuketang."
