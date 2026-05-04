@echo off
setlocal
cd /d "%~dp0"

REM Start the local proxy server and open the UI.
set "BLUELENS_URL=http://127.0.0.1:8787/"
set "BLUELENS_PING=http://127.0.0.1:8787/api/ping"

start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Set-Location -LiteralPath '%~dp0'; node server.js"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(20);" ^
  "do { try { $res=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8787/api/ping' -TimeoutSec 2; if ($res.StatusCode -eq 200) { exit 0 } } catch {} ; Start-Sleep -Milliseconds 350 } while ((Get-Date) -lt $deadline); exit 1"

if errorlevel 1 (
  echo BlueLens server did not respond at %BLUELENS_PING% within 20 seconds.
  echo Open %BLUELENS_URL% manually after the server starts.
  exit /b 1
)

start "" "%BLUELENS_URL%"
