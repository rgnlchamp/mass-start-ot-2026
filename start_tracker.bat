@echo off
TITLE Olympic Trials Tracker Launcher
:: FORCE navigate to the correct project folder, regardless of where this file is located
cd /d "c:\Users\rgnlc\.gemini\antigravity\scratch\Mass_Start_Olympic_Trials\"

echo ====================================================
echo    STARTING OLYMPIC TRIALS TRACKER
echo ====================================================
echo.
echo 1. Starting local server...
start "OlympicTrackerServer" /min cmd /c "npx -y serve -s . -p 8080"

echo 2. Waiting for server to initialize...
timeout /t 4 >nul

echo 3. Opening application in browser...
start http://localhost:8080

echo.
echo Success! The application should be open in your browser.
echo You can close this window now (the server will keep running in the background/minimized).
echo.
pause
