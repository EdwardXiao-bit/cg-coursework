@echo off
rem One-click local server launcher for a homework package (hw1 / hw2 / ...).
rem Required because the page loads shader files with synchronous AJAX,
rem which browsers block under the file:// protocol.
rem It auto-detects the *Code folder and its entry .html page, so the same
rem script works whatever homework the package was built from.
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PAGE="
for /d %%D in ("*Code") do (
    for %%F in ("%%~fD\*.html") do (
        set "PAGE=%%~nxD/%%~nxF"
    )
)
if not defined PAGE (
    echo [error] Cannot find a *Code folder containing an .html page here.
    echo         Please unzip the whole package and run this script again.
    echo.
    pause
    goto :eof
)

echo ============================================
echo   CG homework - interactive WebGL demo
echo   Page: !PAGE!
echo   Starting local server ...
echo ============================================
echo.

where python >nul 2>nul && (
    echo [info] using Python
    start "" "http://localhost:8000/!PAGE!"
    python -m http.server 8000
    goto :eof
)

where py >nul 2>nul && (
    echo [info] using Python launcher
    start "" "http://localhost:8000/!PAGE!"
    py -m http.server 8000
    goto :eof
)

where node >nul 2>nul && (
    echo [info] Python not found, using Node.js
    start "" "http://localhost:8000/!PAGE!"
    npx --yes http-server -p 8000
    goto :eof
)

echo [error] Neither Python nor Node.js was found.
echo.
echo Please do ONE of the following:
echo   1. Install Python 3 : https://www.python.org/downloads/
echo   2. Install Node.js  : https://nodejs.org/
echo   3. Open this folder in VS Code, install the "Live Server"
echo      extension, then right-click the .html page in the *Code folder
echo      and choose "Open with Live Server".
echo.
pause
