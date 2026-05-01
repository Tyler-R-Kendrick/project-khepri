param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-CommandStatus {
  param([string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return @{
      name = $Name
      found = $false
      path = $null
      version = $null
    }
  }

  $version = $null
  try {
    if ($Name -eq "specify") {
      $version = (& specify --version 2>$null) -join "`n"
    } elseif ($Name -eq "uv") {
      $version = (& uv --version 2>$null) -join "`n"
    } elseif ($Name -eq "git") {
      $version = (& git --version 2>$null) -join "`n"
    }
  } catch {
    $version = $_.Exception.Message
  }

  return @{
    name = $Name
    found = $true
    path = $command.Source
    version = $version
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$checks = @{
  repoRoot = $repoRoot
  tools = @(
    (Get-CommandStatus "git"),
    (Get-CommandStatus "uv"),
    (Get-CommandStatus "specify")
  )
  hasSpecifyDirectory = Test-Path (Join-Path $repoRoot ".specify")
  hasCodexIntegration = Test-Path (Join-Path $repoRoot ".specify\integration.json")
  hasSpeckitSkills = Test-Path (Join-Path $repoRoot ".agents\skills\speckit-specify\SKILL.md")
  integrationList = $null
}

if ($checks.hasSpecifyDirectory -and ($checks.tools | Where-Object { $_.name -eq "specify" }).found) {
  try {
    $env:PYTHONIOENCODING = "utf-8"
    $env:PYTHONUTF8 = "1"
    $checks.integrationList = (& specify integration list 2>&1) -join "`n"
  } catch {
    $checks.integrationList = $_.Exception.Message
  }
}

if ($Json) {
  $checks | ConvertTo-Json -Depth 5
  exit 0
}

"Spec Kit environment check"
"Repo: $($checks.repoRoot)"
foreach ($tool in $checks.tools) {
  $status = if ($tool.found) { "found" } else { "missing" }
  "- $($tool.name): $status $($tool.version)"
}
"- .specify present: $($checks.hasSpecifyDirectory)"
"- codex integration metadata: $($checks.hasCodexIntegration)"
"- speckit skills installed: $($checks.hasSpeckitSkills)"
if ($checks.integrationList) {
  ""
  "Integration list:"
  $checks.integrationList
}
