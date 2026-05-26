# Free common local dev ports (Windows).
#   npm run local:stop-ports
# Tries Get-NetTCPConnection first, then netstat + taskkill (often works without elevation).

$ports = @(5000, 5020, 5173)

function Stop-Port-Netstat([int]$port) {
  $raw = netstat -ano 2>$null | Select-String ":$port\s" | Select-String "LISTENING"
  foreach ($line in $raw) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    $last = $parts | Select-Object -Last 1
    if ($last -match "^\d+$") {
      $procId = [int]$last
      Write-Host "netstat: stopping PID $procId on port $port"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

foreach ($port in $ports) {
  $found = $false
  try {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $listeners) {
      $owning = $c.OwningProcess
      if ($owning) {
        $found = $true
        Write-Host "Stopping PID $owning on port $port (Get-NetTCPConnection)"
        Stop-Process -Id $owning -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    Write-Host "Note: Get-NetTCPConnection failed for port $port - trying netstat."
  }
  if (-not $found) {
    Stop-Port-Netstat -port $port
  }
}

Write-Host 'Done. If a port is still in use, run elevated PowerShell or close the app manually.'
