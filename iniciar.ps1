#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "[BetterVault] Iniciando servidor local em http://127.0.0.1:4325 ..." -ForegroundColor Cyan
Start-Job -ScriptBlock {
    Start-Sleep -Milliseconds 800
    Start-Process "http://127.0.0.1:4325"
} | Out-Null

python bibliotecario.py servir --porta 4325
