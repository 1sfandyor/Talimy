param(
  [string]$RemoteName,
  [string]$RemoteUrl,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info {
  param([string]$Message)
  Write-Host "[post-push-ci-watch] $Message"
}

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-GhExecutablePath {
  $fromPath = Get-Command gh -ErrorAction SilentlyContinue
  if ($fromPath -and $fromPath.Source) {
    return $fromPath.Source
  }

  $candidatePaths = @(
    @(
      (Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"),
      (Join-Path $env:ProgramFiles "GitHub CLI\bin\gh.exe"),
      (Join-Path ${env:ProgramFiles(x86)} "GitHub CLI\gh.exe"),
      (Join-Path ${env:ProgramFiles(x86)} "GitHub CLI\bin\gh.exe"),
      (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI\gh.exe"),
      (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI\bin\gh.exe")
    ) | Where-Object { $_ -and (Test-Path $_) }
  )

  if ($candidatePaths.Count -gt 0) {
    return $candidatePaths[0]
  }

  return $null
}

function Test-GhAuthenticated {
  param([Parameter(Mandatory = $true)][string]$GhPath)
  try {
    & $GhPath auth status *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Get-RepoRootFromScript {
  if (-not $PSScriptRoot) {
    throw "PSScriptRoot is not available."
  }
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-CurrentBranch {
  param([Parameter(Mandatory = $true)][string]$RepoRoot)
  Push-Location $RepoRoot
  try {
    return (git branch --show-current).Trim()
  } finally {
    Pop-Location
  }
}

function Get-SkillScriptPath {
  $userProfile = $env:USERPROFILE
  if (-not $userProfile) { return $null }
  $path = Join-Path $userProfile ".codex\skills\gh-ci-watch-repair\scripts\auto_ci_loop.ps1"
  if (Test-Path $path) { return (Resolve-Path $path).Path }
  return $null
}

function Get-LockFilePath {
  param([Parameter(Mandatory = $true)][string]$RepoRoot)
  return Join-Path $RepoRoot ".git\ci-watch-post-push.pid"
}

function Test-ExistingWatcher {
  param([Parameter(Mandatory = $true)][string]$LockFile)

  if (-not (Test-Path $LockFile)) { return $false }

  try {
    $pidText = (Get-Content -Raw $LockFile).Trim()
    if (-not $pidText) { return $false }
    $pid = [int]$pidText
    $proc = Get-Process -Id $pid -ErrorAction Stop
    if ($proc.HasExited) { return $false }
    return $true
  } catch {
    return $false
  }
}

function Start-WatcherProcess {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$BranchName,
    [Parameter(Mandatory = $true)][string]$SkillScriptPath
  )

  $autoFixRequested = ($env:TALIMY_POST_PUSH_CI_WATCH_AUTOFIX -eq "1")
  $isProtectedBranch = @("main", "master") -contains $BranchName
  $allowProtectedAutoFix = ($env:TALIMY_POST_PUSH_CI_WATCH_AUTOFIX_PROTECTED -eq "1")
  $autoFixEnabled = $autoFixRequested -and ((-not $isProtectedBranch) -or $allowProtectedAutoFix)
  $maxAttempts = if ($env:TALIMY_POST_PUSH_CI_WATCH_MAX_ATTEMPTS) { $env:TALIMY_POST_PUSH_CI_WATCH_MAX_ATTEMPTS } else { "2" }
  $interval = if ($env:TALIMY_POST_PUSH_CI_WATCH_INTERVAL_SECONDS) { $env:TALIMY_POST_PUSH_CI_WATCH_INTERVAL_SECONDS } else { "20" }
  $watchMaxMinutes = if ($env:TALIMY_POST_PUSH_CI_WATCH_MAX_MINUTES) { $env:TALIMY_POST_PUSH_CI_WATCH_MAX_MINUTES } else { "60" }

  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $SkillScriptPath,
    "-RepoPath", $RepoRoot,
    "-Branch", $BranchName,
    "-IntervalSeconds", $interval,
    "-WatchMaxMinutes", $watchMaxMinutes,
    "-MaxAttempts", $maxAttempts
  )

  if ($autoFixEnabled) {
    $args += "-AutoFix"
    if ($isProtectedBranch) {
      $args += "-AllowMain"
      Write-Info "AutoFix enabled on protected branch via TALIMY_POST_PUSH_CI_WATCH_AUTOFIX_PROTECTED=1"
    } else {
      Write-Info "AutoFix mode enabled on feature branch via TALIMY_POST_PUSH_CI_WATCH_AUTOFIX=1"
    }
  } elseif ($autoFixRequested -and $isProtectedBranch) {
    Write-Info "AutoFix requested, but '$BranchName' is protected. Running watch-only (set TALIMY_POST_PUSH_CI_WATCH_AUTOFIX_PROTECTED=1 to override)."
  }

  if ($DryRun) {
    Write-Info ("DryRun: powershell.exe " + (($args | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join " "))
    return $null
  }

  $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $args -WindowStyle Minimized -PassThru
  return $proc
}

if ($env:TALIMY_POST_PUSH_CI_WATCH -eq "0") {
  Write-Info "Disabled via TALIMY_POST_PUSH_CI_WATCH=0"
  exit 0
}

$repoRoot = Get-RepoRootFromScript
$branchName = Get-CurrentBranch -RepoRoot $repoRoot
if (-not $branchName) {
  Write-Info "Could not determine current branch. Skipping."
  exit 0
}

if (-not (Test-CommandExists -Name "git")) {
  Write-Info "git not found. Skipping."
  exit 0
}

if (-not (Test-CommandExists -Name "python")) {
  Write-Info "python not found. Skipping."
  exit 0
}

$ghExePath = Get-GhExecutablePath
if (-not $ghExePath) {
  Write-Info "gh CLI not found. Skipping watcher launch."
  exit 0
}
$ghDir = Split-Path -Parent $ghExePath
if (-not ($env:PATH -split ";" | Where-Object { $_ -eq $ghDir })) {
  $env:PATH = "$ghDir;$env:PATH"
}

if (-not (Test-GhAuthenticated -GhPath $ghExePath)) {
  Write-Info "gh CLI is installed but not authenticated. Run 'gh auth login' once, then push again."
  exit 0
}

$skillScript = Get-SkillScriptPath
if (-not $skillScript) {
  Write-Info "Skill script not found at %USERPROFILE%\\.codex\\skills\\gh-ci-watch-repair\\scripts\\auto_ci_loop.ps1. Skipping."
  exit 0
}

$lockFile = Get-LockFilePath -RepoRoot $repoRoot
if (Test-ExistingWatcher -LockFile $lockFile) {
  Write-Info "Existing CI watcher is already running (lock: $lockFile). Skipping duplicate launch."
  exit 0
}

$proc = Start-WatcherProcess -RepoRoot $repoRoot -BranchName $branchName -SkillScriptPath $skillScript
if ($null -eq $proc) {
  exit 0
}

Set-Content -Path $lockFile -Value $proc.Id -Encoding ASCII
Write-Info "Started CI watcher (PID=$($proc.Id)) for branch '$branchName'."
if ($RemoteName) {
  Write-Info "Push remote: $RemoteName $RemoteUrl"
}
