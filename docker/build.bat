@echo off
REM ═══════════════════════════════════════════════════════
REM   Build KeysOsi Lab Kali image (Windows)
REM ═══════════════════════════════════════════════════════
cd /d "%~dp0"
echo.
echo   Construction de l'image aura-lab:latest ...
echo   (1ere execution = 10-20 min, telechargement Kali ~500MB)
echo.
docker build -t aura-lab:latest .
if %ERRORLEVEL% neq 0 (
    echo.
    echo   [X] Echec du build. Verifie que Docker Desktop tourne et que WSL2 est installe.
    exit /b 1
)
echo.
echo   [OK] Image aura-lab:latest prete.
echo   Lance le serveur KeysOsi-Link, puis clique "Start Lab" dans l'extension.
