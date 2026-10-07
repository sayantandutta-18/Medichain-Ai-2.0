Write-Host "=== MediChain-AI Sui Testnet Deploy Script ===" -ForegroundColor Cyan

if (-not (Get-Command sui -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: 'sui' CLI is not installed or not in PATH.`nPlease install Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
}

Write-Host "Active Sui environment:"
sui client active-env

Write-Host "Publishing Move package to Sui testnet..."
$output = sui client publish --gas-budget 30000000 --json ./sui | Out-String

Write-Host ""
Write-Host "=== Move Package Published ===" -ForegroundColor Green
Write-Host "Please extract the published packageId and registry objectId from output and set in .env:"
Write-Host "SUI_NETWORK=testnet"
Write-Host "SUI_PACKAGE_ID=<published_package_id>"
Write-Host "SUI_REGISTRY_ID=<shared_registry_object_id>"
Write-Host "=============================="
