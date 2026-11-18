@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [BetterVault] Sincronizando biblioteca e iniciando servidor na porta 4325...
start "" "http://127.0.0.1:4325"
python bibliotecario.py servir --porta 4325
