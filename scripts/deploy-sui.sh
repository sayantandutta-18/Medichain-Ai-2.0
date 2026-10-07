#!/usr/bin/env bash
set -euo pipefail

echo "=== MediChain-AI Sui Testnet Deploy Script ==="

# Check sui CLI exists
if ! command -v sui &> /dev/null; then
    echo "ERROR: 'sui' CLI is not installed or not in PATH."
    echo "Please install Sui CLI from https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

echo "Active Sui environment:"
sui client active-env

echo "Publishing Move package to Sui testnet..."
OUTPUT=$(sui client publish --gas-budget 30000000 --json ./sui)

# Extract Package ID and Shared Registry Object ID
PACKAGE_ID=$(echo "$OUTPUT" | grep -oE '"packageId":\s*"0x[a-fA-F0-9]+"' | head -n 1 | awk -F'"' '{print $4}' || echo "")
REGISTRY_ID=$(echo "$OUTPUT" | grep -oE '"objectId":\s*"0x[a-fA-F0-9]+"' | head -n 1 | awk -F'"' '{print $4}' || echo "")

echo ""
echo "=== Deployment Successful! ==="
echo "Copy these values into your .env file:"
echo "SUI_NETWORK=testnet"
echo "SUI_PACKAGE_ID=${PACKAGE_ID:-'<extract-from-sui-explorer>'}"
echo "SUI_REGISTRY_ID=${REGISTRY_ID:-'<extract-from-sui-explorer>'}"
echo "=============================="
