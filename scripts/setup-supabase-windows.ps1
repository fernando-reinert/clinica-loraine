# Setup Supabase CLI no Windows via Scoop e opcionalmente deploy da Edge Function createStaffInvite.
# Uso: .\scripts\setup-supabase-windows.ps1
#       .\scripts\setup-supabase-windows.ps1 -InstallOnly   # só instala o CLI
#       .\scripts\setup-supabase-windows.ps1 -ProjectRef "vwmzyfjqprutlaevmsjk"

param(
    [switch]$InstallOnly,
    [string]$ProjectRef = "vwmzyfjqprutlaevmsjk"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Setup Supabase CLI (Windows) ===" -ForegroundColor Cyan

# 1) ExecutionPolicy
Write-Host "`n[1/4] Verificando ExecutionPolicy..." -ForegroundColor Yellow
$policy = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction SilentlyContinue
if ($policy -eq "Restricted" -or $policy -eq "Undefined") {
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "    ExecutionPolicy definido para RemoteSigned (CurrentUser)." -ForegroundColor Green
} else {
    Write-Host "    ExecutionPolicy OK: $policy" -ForegroundColor Green
}

# 2) Scoop
Write-Host "`n[2/4] Verificando Scoop..." -ForegroundColor Yellow
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "    Instalando Scoop..." -ForegroundColor Gray
    irm get.scoop.sh | iex
    Write-Host "    Scoop instalado." -ForegroundColor Green
} else {
    Write-Host "    Scoop já instalado." -ForegroundColor Green
}

# 3) Bucket Supabase + CLI
Write-Host "`n[3/4] Verificando Supabase CLI..." -ForegroundColor Yellow
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git 2>$null
    scoop install supabase
    Write-Host "    Supabase CLI instalado." -ForegroundColor Green
} else {
    Write-Host "    Supabase CLI já instalado." -ForegroundColor Green
}

$version = supabase --version 2>$null
Write-Host "    Versão: $version" -ForegroundColor Gray

# 4) Login / Link / Deploy (opcional)
if (-not $InstallOnly) {
    Write-Host "`n[4/4] Login, link e deploy (createStaffInvite)..." -ForegroundColor Yellow
    Write-Host "    Executando: supabase login" -ForegroundColor Gray
    supabase login
    Write-Host "    Executando: supabase link --project-ref $ProjectRef" -ForegroundColor Gray
    supabase link --project-ref $ProjectRef
    Write-Host "    Executando: supabase functions deploy createStaffInvite" -ForegroundColor Gray
    supabase functions deploy createStaffInvite
    Write-Host "    Deploy concluído." -ForegroundColor Green
} else {
    Write-Host "`n[4/4] Ignorado (InstallOnly). Para login/link/deploy, execute o script sem -InstallOnly." -ForegroundColor Gray
}

Write-Host "`n=== Teste CORS (preflight OPTIONS) ===" -ForegroundColor Cyan
Write-Host "PowerShell:" -ForegroundColor Yellow
Write-Host '  Invoke-WebRequest -Method OPTIONS -Uri "https://' + $ProjectRef + '.supabase.co/functions/v1/createStaffInvite" -Headers @{ "Origin" = "http://localhost:5173" } -UseBasicParsing | Select-Object StatusCode, Headers'
Write-Host "`ncurl:" -ForegroundColor Yellow
Write-Host '  curl.exe -X OPTIONS "https://' + $ProjectRef + '.supabase.co/functions/v1/createStaffInvite" -H "Origin: http://localhost:5173" -v'
Write-Host "`nEsperado: StatusCode 200 e headers Access-Control-Allow-Origin." -ForegroundColor Gray
Write-Host "`nConcluído." -ForegroundColor Green
