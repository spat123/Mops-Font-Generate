# Управление VPS с Windows без ввода пароля в SSH (только ключ).
# Перед первым запуском: добавьте reg_dynamicfont.pub в REG или в ~/.ssh/authorized_keys на сервере.
#
# Использование (PowerShell из папки проекта):
#   .\scripts\vps-from-pc.ps1 -Action shell
#   .\scripts\vps-from-pc.ps1 -Action upload-env
#   .\scripts\vps-from-pc.ps1 -Action deploy

param(
  [string]$VpsIp = "194.226.166.79",
  [string]$SshKey = "$env:USERPROFILE\.ssh\reg_dynamicfont",
  [string]$LocalEnv = "C:\Mops-Font-Generate\.env.local",
  [ValidateSet("shell", "upload-env", "deploy", "status", "logs")]
  [string]$Action = "shell"
)

$ErrorActionPreference = "Stop"
$RemoteDir = "/opt/dinamic-font"
$SshTarget = "root@$VpsIp"
$SshArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new")

if (-not (Test-Path $SshKey)) {
  Write-Error "Нет ключа $SshKey — сгенерируйте: ssh-keygen -t ed25519 -f `"$SshKey`" -N '""'"
}

function Invoke-Ssh([string]$Command) {
  & ssh @SshArgs $SshTarget $Command
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Action) {
  "shell" {
    & ssh @SshArgs $SshTarget
  }
  "upload-env" {
    if (-not (Test-Path $LocalEnv)) {
      Write-Error "Нет файла $LocalEnv"
    }
    & scp @SshArgs $LocalEnv "${SshTarget}:${RemoteDir}/.env.production"
    Invoke-Ssh "chmod 600 ${RemoteDir}/.env.production && grep -E '^NEXTAUTH_URL=|^DATABASE_URL=' ${RemoteDir}/.env.production | sed 's/=.*/=***/' || true"
    Write-Host "OK: .env.production загружен на VPS"
  }
  "deploy" {
    Invoke-Ssh "cd ${RemoteDir} && git pull && docker compose -f docker-compose.prod.yml up -d --build"
    Write-Host "OK: deploy завершён"
  }
  "status" {
    Invoke-Ssh "cd ${RemoteDir} && docker compose -f docker-compose.prod.yml ps && curl -sI http://127.0.0.1:3000/ | head -n 1"
  }
  "logs" {
    Invoke-Ssh "cd ${RemoteDir} && docker compose -f docker-compose.prod.yml logs -f app --tail 80"
  }
}
