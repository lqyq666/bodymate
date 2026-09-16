[CmdletBinding()]
param(
  [string] $BaseUrl = 'https://open.bigmodel.cn/api/paas/v4',
  [string] $Model = 'glm-5.3-flash'
)

$ErrorActionPreference = 'Stop'
$apiKey = [string](Get-Clipboard -Raw)
$apiKey = $apiKey.Trim()
if ($apiKey.Length -lt 16 -or $apiKey -match '\s') { throw 'Clipboard does not contain a usable API key.' }
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) { throw 'LOCALAPPDATA is unavailable.' }

$provider = [ordered]@{
  BODYMATE_AI_API_KEY = $apiKey
  BODYMATE_AI_BASE_URL = $BaseUrl.Trim()
  BODYMATE_AI_MODEL = $Model.Trim()
} | ConvertTo-Json -Compress

$dpapiScript = Join-Path $PSScriptRoot 'bodymate-ai-dpapi.ps1'
$ciphertext = [string]($provider | & powershell.exe -NoProfile -NonInteractive -File $dpapiScript -Mode protect)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ciphertext)) { throw 'Could not protect the local AI configuration.' }

$targetDirectory = Join-Path $env:LOCALAPPDATA 'BodyMate'
$targetPath = Join-Path $targetDirectory 'ai-provider.dpapi.json'
$envelope = [ordered]@{ format = 'bodymate-ai-dpapi-v1'; ciphertext = $ciphertext.Trim() } | ConvertTo-Json -Compress
[System.IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
[System.IO.File]::WriteAllText($targetPath, $envelope, [System.Text.UTF8Encoding]::new($false))
Write-Output 'BodyMate GLM configuration is protected for the current Windows user.'
