param(
  [ValidateSet('fast', 'full')]
  [string]$Mode = 'full'
)

$ErrorActionPreference = 'Continue'
$script:Failed = $false
$script:Pending = $false

function Write-Green([string]$Message) { Write-Host "OK  $Message" -ForegroundColor Green }
function Write-Red([string]$Message) {
  Write-Host "ERR $Message" -ForegroundColor Red
  $script:Failed = $true
}
function Write-Pending([string]$Message) {
  Write-Host "... $Message" -ForegroundColor Yellow
  $script:Pending = $true
}

function Invoke-NativeGate {
  param(
    [string]$Label,
    [string]$Executable,
    [string[]]$Arguments
  )

  & $Executable @Arguments *> $null
  if ($LASTEXITCODE -eq 0) { Write-Green $Label } else { Write-Red $Label }
}

Invoke-NativeGate 'C1 typecheck' 'pnpm.cmd' @('exec', 'tsc', '--noEmit')

& git diff --exit-code --quiet -- package.json pnpm-lock.yaml
if ($LASTEXITCODE -eq 0) {
  Write-Green 'C2 deps'
} else {
  Write-Red 'C2 deps - package.json/pnpm-lock.yaml cambio sin aprobacion'
}

$protectedPaths = @(
  '.gitignore',
  'AGENTS.md',
  'scripts/gates.ps1',
  'scripts/gates.sh',
  'docs/ai/constitution.md',
  'docs/ai/repo-profile.md'
)
$protectedStatus = & git status --porcelain --untracked-files=all -- $protectedPaths
if ([string]::IsNullOrWhiteSpace(($protectedStatus -join ''))) {
  Write-Green 'C3 gobernanza protegida'
} else {
  Write-Red 'C3 gobernanza protegida - requiere diff exacto y commit humano'
}

Invoke-NativeGate 'C4 tests' 'pnpm.cmd' @('test')

$openSpecValid = $true
if (Test-Path -LiteralPath 'openspec/changes') {
  $changes = Get-ChildItem -LiteralPath 'openspec/changes' -Directory |
    Where-Object { $_.Name -ne 'archive' }
  foreach ($change in $changes) {
    & openspec validate $change.Name --strict --no-interactive *> $null
    if ($LASTEXITCODE -ne 0) { $openSpecValid = $false }
  }
}
if ($openSpecValid) { Write-Green 'C6 OpenSpec strict' } else { Write-Red 'C6 OpenSpec strict' }

if ($Mode -eq 'full') {
  & pnpm.cmd lint *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Green 'C5 lint'
  } else {
    Write-Pending 'C5 lint - 76 errores/19 warnings heredados al 2026-07-23'
  }
  Invoke-NativeGate 'C7 build web + Electron' 'pnpm.cmd' @('run', 'package:build')

  & pnpm.cmd exec fallow *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Green 'C8 fallow'
  } else {
    Write-Pending 'C8 fallow - deuda heredada, baseline pendiente de Ale'
  }
}

$result = if ($script:Failed) { 'ROJO' } elseif ($script:Pending) { 'PENDIENTE' } else { 'VERDE' }
$logDir = 'docs/ai/logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$entry = [ordered]@{
  ts = (Get-Date).ToString('o')
  mode = $Mode
  result = $result
} | ConvertTo-Json -Compress
Add-Content -LiteralPath (Join-Path $logDir 'gates.jsonl') -Value $entry -Encoding utf8

Write-Host '----------------------------'
Write-Host "GATES: $result ($Mode)"
if ($script:Failed) { exit 1 }
exit 0
