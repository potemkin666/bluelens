@echo off
setlocal
cd /d "%~dp0"

REM Start the local proxy server and open the UI.
start "" "http://127.0.0.1:8787/"

node server.js
