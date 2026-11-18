@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4325/ui/index.html' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
    echo [BetterVault] Servidor ja ativo na porta 4325. Abrindo central...
    start "" "http://127.0.0.1:4325/ui/index.html"
    exit /b 0
)
echo [BetterVault] Iniciando servidor local na porta 4325...
start "" "http://127.0.0.1:4325/ui/index.html"
python bibliotecario.py servir --porta 4325
