@echo off
rem Launch DeepSeek Harness with the cg-coursework repo as the workspace.
rem The workspace is simply the folder dsh is started from, so this script
rem cd's into the repo root first and then boots the web UI.
setlocal
cd /d "%~dp0"
echo Workspace: %CD%
call dsh web %*
