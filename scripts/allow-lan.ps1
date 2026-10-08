# Run once from an Administrator PowerShell. Only local-subnet clients may connect.
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'PowerShell ni Run as administrator orqali oching va bu skriptni qayta ishga tushiring.'
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$ruleName = 'CamPath-Dev-LAN-5173'
$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($rule) {
  Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -Profile Any -Program $nodePath | Out-Null
} else {
  New-NetFirewallRule -Name $ruleName -DisplayName 'CamPath LAN (TCP 5173)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -Profile Any -Program $nodePath | Out-Null
}
Write-Host 'Tayyor: lokal tarmoq uchun TCP 5173 portiga ruxsat berildi.'
