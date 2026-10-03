@echo off
title YR Stream - Local Media Server Launcher
echo ========================================================
echo    YR STREAM - STARTING LOCAL MEDIA SERVER ^& WEB APP
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start-yrstream.ps1"
pause
