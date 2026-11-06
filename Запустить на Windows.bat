@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title TransLine CRM - local server

echo.
echo  TransLine CRM - starting local server...
echo.

where node >nul 2>nul
if errorlevel 1 goto :powershell

node "%~dp0serve.mjs"
goto :end

:powershell
echo  Node.js not found - using the built-in Windows PowerShell server.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if not errorlevel 1 goto :end

echo.
echo  Could not start the local server.
echo  Opening index.html directly in your browser...
start "" "%~dp0index.html"
goto :end

:end
echo.
pause
