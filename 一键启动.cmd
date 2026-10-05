@echo off
setlocal
title Internet Wanderer
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24, then launch again.
  pause
  exit /b 1
)
node.exe "%~dp0internet-wanderer\scripts\start.mjs" %*
set "launcher_exit=%ERRORLEVEL%"
if not "%launcher_exit%"=="0" (
  echo.
  echo Internet Wanderer could not start. See the message above.
  pause
)
exit /b %launcher_exit%
