@echo off
cd /d V:\the-challenge-game
echo Getting Fly.io auth token...
flyctl auth token > fly-token.txt 2>&1
if %errorlevel% neq 0 (
  echo flyctl not found or not logged in. Trying flyctl tokens create deploy...
  flyctl tokens create deploy -x 8760h > fly-token.txt 2>&1
)
echo.
echo === TOKEN SAVED TO fly-token.txt ===
type fly-token.txt
echo.
pause
