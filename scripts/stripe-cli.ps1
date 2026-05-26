# Resolves Stripe CLI after winget install (PATH may need a new terminal).
$stripePaths = @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe",
  "$env:ProgramFiles\Stripe\stripe.exe"
)

$stripeExe = $null
foreach ($p in $stripePaths) {
  if (Test-Path $p) {
    $stripeExe = $p
    break
  }
}

if (-not $stripeExe) {
  $cmd = Get-Command stripe -ErrorAction SilentlyContinue
  if ($cmd) {
    $stripeExe = $cmd.Source
  }
}

if (-not $stripeExe) {
  Write-Host "Stripe CLI not found. Install with:" -ForegroundColor Red
  Write-Host "  winget install Stripe.StripeCli" -ForegroundColor Yellow
  Write-Host "Then close and reopen this terminal, or run this script again." -ForegroundColor Yellow
  exit 1
}

& $stripeExe @args
exit $LASTEXITCODE
