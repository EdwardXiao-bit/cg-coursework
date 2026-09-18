@echo off
rem HW1 - one-click local server launcher
rem Required because the page loads shader files with synchronous AJAX,
rem which browsers block under the file:// protocol.
setlocal
cd /d "%~dp0"

echo ============================================
echo   HW1 - Interactive 2D Drawing (Fractal)
echo   Starting local server ...
echo ============================================
echo.

where python >nul 2>nul && (
    echo [info] using Python
    start "" http://localhost:8000/hw1Code/hw1.html
    python -m http.server 8000
    goto :eof
)

where py >nul 2>nul && (
    echo [info] using Python launcher
    start "" http://localhost:8000/hw1Code/hw1.html
    py -m http.server 8000
    goto :eof
)

where node >nul 2>nul && (
    echo [info] Python not found, using Node.js
    start "" http://localhost:8000/hw1Code/hw1.html
    npx --yes http-server -p 8000
    goto :eof
)

echo [error] Neither Python nor Node.js was found.
echo.
echo Please do ONE of the following:
echo   1. Install Python 3 : https://www.python.org/downloads/
echo   2. Install Node.js  : https://nodejs.org/
echo   3. Open this folder in VS Code, install the "Live Server"
echo      extension, then right-click hw1Code\hw1.html and choose
echo      "Open with Live Server".
echo.
pause
