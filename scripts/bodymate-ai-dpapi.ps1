[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('protect', 'unprotect')]
  [string] $Mode
)

$ErrorActionPreference = 'Stop'
if (-not ('System.Security.Cryptography.ProtectedData' -as [type])) {
  try { Add-Type -AssemblyName System.Security.Cryptography.ProtectedData -ErrorAction Stop }
  catch { Add-Type -AssemblyName System.Security -ErrorAction Stop }
}
$value = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($value)) { throw 'DPAPI input is required.' }

$encoding = [System.Text.UTF8Encoding]::new($false)
if ($Mode -eq 'protect') {
  $bytes = $encoding.GetBytes($value)
  $protected = [System.Security.Cryptography.ProtectedData]::Protect(
    $bytes,
    $null,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  [Console]::Out.Write([Convert]::ToBase64String($protected))
  exit 0
}

try {
  $protected = [Convert]::FromBase64String($value.Trim())
  $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
    $protected,
    $null,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  [Console]::Out.Write($encoding.GetString($bytes))
} catch {
  throw 'DPAPI could not decrypt the current-user configuration.'
}
