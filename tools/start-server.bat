@echo off
rem One-click local server launcher for a homework package (hw1 / hw2 / ...).
rem Required because the page loads shader files with synchronous AJAX,
rem which browsers block under the file:// protocol.
rem
rem It auto-detects the *Code folder and its entry .html page, so the same
rem script works whatever homework the package was built from. It also:
rem   - reuses an already running server if that URL already answers HTTP 200
rem   - picks a free port (8000..8010) instead of failing when 8000 is taken
rem   - waits until the page really answers 200 before opening the browser
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
    echo         Run this script inside the unzipped package, in the same
    echo         folder as the *Code folder ^(e.g. executable\^).
    echo.
    pause
    goto :eof
)

rem --- reuse a server that already serves this exact page ---
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://localhost:8000/!PAGE!'; if($r.StatusCode -eq 200){exit 0} } catch {}; exit 1"
if not errorlevel 1 (
    echo [info] a server is already running on port 8000 and serves this page.
    echo [ok] opening http://localhost:8000/!PAGE!
    start "" "http://localhost:8000/!PAGE!"
    goto :eof
)

rem --- pick a free port ---
set "PORT="
for /f "delims=" %%P in ('powershell -NoProfile -Command "$ok=0; foreach($p in 8000..8010){ try { $l=New-Object Net.Sockets.TcpListener([ipaddress]::Loopback,$p); $l.Start(); $l.Stop(); $ok=$p; break } catch {} }; $ok"') do set "PORT=%%P"
if not defined PORT set "PORT=8000"
if "!PORT!"=="0" set "PORT=8000"

set "URL=http://localhost:!PORT!/!PAGE!"

echo ============================================
echo   CG homework - interactive WebGL demo
echo   Page : !PAGE!
echo   URL  : !URL!
echo ============================================
echo.

rem --- start the server in its own window ---
where python >nul 2>nul && (
    echo [info] starting Python http.server on port !PORT! ...
    start "CG local server" cmd /k python -m http.server !PORT!
    goto :wait
)
where py >nul 2>nul && (
    echo [info] starting Python launcher http.server on port !PORT! ...
    start "CG local server" cmd /k py -m http.server !PORT!
    goto :wait
)
where node >nul 2>nul && (
    echo [info] Python not found, starting Node http-server on port !PORT! ...
    start "CG local server" cmd /k npx --yes http-server -p !PORT!
    goto :wait
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
goto :eof

:wait
echo [info] waiting for !URL! to answer HTTP 200 ...
powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '!URL!'; if($r.StatusCode -eq 200){exit 0} } catch {}; Start-Sleep -Milliseconds 250 }; exit 1"
if errorlevel 1 (
    echo [warn] !URL! did not answer HTTP 200.
    echo        The URL above is what the browser will open: check it by hand.
    echo        If the port was taken by another program, close that program
    echo        or run this script again.
    echo.
    pause
    goto :eof
)

echo [ok] page is served, opening !URL!
start "" "!URL!"
rem keep this window readable for a moment (ping works even without a console stdin)
ping -n 4 127.0.0.1 >nul
endlocal
