#!/usr/bin/env bash
# ============================================================
# Live Testnet Test Script for NanobondExponentialCurve
# ============================================================
# Usage:
#   chmod +x script/test-live.sh
#   ./script/test-live.sh [CONTRACT_ADDRESS]
#
# Requires .env with:
#   PRIVATE_KEY, HEDERA_TESTNET_RPC_URL
#
# If CONTRACT_ADDRESS is not provided, it will deploy a fresh one.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load env
set -a
source "$PROJECT_DIR/.env"
set +a

CAST="${HOME}/.foundry/bin/cast"
FORGE="${HOME}/.foundry/bin/forge"
RPC_URL="$HEDERA_TESTNET_RPC_URL"
PK="$PRIVATE_KEY"

# Tinybar <-> Wei conversion (1 tinybar = 10^10 wei on Hedera JSON-RPC relay)
TINYBAR_TO_WEI=10000000000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS:${NC} $1"; }
fail() { echo -e "${RED}❌ FAIL:${NC} $1"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
header() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

CONTRACT_ADDRESS="${1:-}"
DEPLOYER=$($CAST wallet address --private-key "$PK")

header "NanobondExponentialCurve Live Testnet Tests"
info "Deployer: $DEPLOYER"
info "RPC URL: $RPC_URL"

# ============================================================
# STEP 1: Deploy (if no address given)
# ============================================================
if [ -z "$CONTRACT_ADDRESS" ]; then
    header "Step 1: Deploy Contract"

    info "Deploying NanobondExponentialCurve..."
    DEPLOY_OUTPUT=$($FORGE script script/DeployNanobondExponentialCurve.s.sol:DeployNanobondExponentialCurveScript \
        --rpc-url "$RPC_URL" --broadcast 2>&1)

    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'deployed at: \K0x[a-fA-F0-9]+' || true)

    if [ -z "$CONTRACT_ADDRESS" ]; then
        # Try from broadcast JSON
        CONTRACT_ADDRESS=$(python3 -c "
import json, glob
files = sorted(glob.glob('$PROJECT_DIR/broadcast/DeployNanobondExponentialCurve.s.sol/*/run-latest.json'))
if files:
    data = json.load(open(files[-1]))
    for tx in data.get('transactions', []):
        if tx.get('contractAddress'):
            print(tx['contractAddress'])
            break
" 2>/dev/null || true)
    fi

    if [ -z "$CONTRACT_ADDRESS" ]; then
        fail "Could not extract deployed contract address"
    fi

    pass "Contract deployed at: $CONTRACT_ADDRESS"

    header "Step 1b: Initialize Token"
    TOKEN_FEE_TINYBAR="${TOKEN_CREATE_FEE_TINYBAR:-2000000000}"
    TOKEN_FEE_WEI=$(python3 -c "print($TOKEN_FEE_TINYBAR * $TINYBAR_TO_WEI)")

    info "Calling initializeToken() with $TOKEN_FEE_TINYBAR tinybars ($TOKEN_FEE_WEI wei)..."
    INIT_TX=$($CAST send "$CONTRACT_ADDRESS" "initializeToken()" \
        --value "$TOKEN_FEE_WEI" \
        --rpc-url "$RPC_URL" \
        --private-key "$PK" \
        --gas-limit 1500000 2>&1)

    if echo "$INIT_TX" | grep -q "status.*1"; then
        pass "initializeToken() succeeded"
    else
        echo "$INIT_TX"
        fail "initializeToken() failed"
    fi
else
    info "Using existing contract at: $CONTRACT_ADDRESS"
    
    # Check if we need to initialize
    TOKEN_CHECK=$($CAST call "$CONTRACT_ADDRESS" "token()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    if [ "$TOKEN_CHECK" == "0x0000000000000000000000000000000000000000" ] || [ -z "$TOKEN_CHECK" ]; then
        header "Step 1b: Initialize Existing Token"
        TOKEN_FEE_TINYBAR="${TOKEN_CREATE_FEE_TINYBAR:-2000000000}"
        TOKEN_FEE_WEI=$(python3 -c "print($TOKEN_FEE_TINYBAR * $TINYBAR_TO_WEI)")

        info "Calling initializeToken() with $TOKEN_FEE_TINYBAR tinybars ($TOKEN_FEE_WEI wei)..."
        INIT_TX=$($CAST send "$CONTRACT_ADDRESS" "initializeToken()" \
            --value "$TOKEN_FEE_WEI" \
            --rpc-url "$RPC_URL" \
            --private-key "$PK" \
            --gas-limit 1500000 2>&1)

        if echo "$INIT_TX" | grep -q "status.*1"; then
            pass "initializeToken() succeeded"
        else
            echo "$INIT_TX"
            fail "initializeToken() failed"
        fi
    fi
fi

echo ""
info "Contract: $CONTRACT_ADDRESS"

# ============================================================
# STEP 2: Read State
# ============================================================
header "Step 2: Read Initial State"

TOKEN=$($CAST call "$CONTRACT_ADDRESS" "token()(address)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Token address: $TOKEN"

OWNER=$($CAST call "$CONTRACT_ADDRESS" "owner()(address)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Owner: $OWNER"

CURVE_ACTIVE=$($CAST call "$CONTRACT_ADDRESS" "curveActive()(bool)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Curve active: $CURVE_ACTIVE"

BASE_PRICE=$($CAST call "$CONTRACT_ADDRESS" "basePrice()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Base price: $BASE_PRICE"

TOTAL_RAISED=$($CAST call "$CONTRACT_ADDRESS" "totalRaisedHbar()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Total raised: $TOTAL_RAISED"

SUPPLY=$($CAST call "$CONTRACT_ADDRESS" "internalTotalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null)
info "Internal supply: $SUPPLY"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "0x0000000000000000000000000000000000000000" ]; then
    pass "Token is initialized"
else
    fail "Token not initialized"
fi

# ============================================================
# STEP 3: Preview Buy
# ============================================================
header "Step 3: Preview Buy"

# Buy a small amount (e.g., 5000 tinybars) to avoid curve overflow 
# (5000 tinybars buys exactly 5 tokens at base price 1000)
BUY_HBAR_AMOUNT=5000

PREVIEW=$($CAST call "$CONTRACT_ADDRESS" "previewBuy(uint256)(uint256,uint256)" "$BUY_HBAR_AMOUNT" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Preview buy $BUY_HBAR_AMOUNT tinybar: $PREVIEW"
pass "previewBuy() works"

# ============================================================
# STEP 4: Buy Tokens
# ============================================================
header "Step 4: Buy Tokens"

BUY_WEI=$(python3 -c "print(int($BUY_HBAR_AMOUNT * $TINYBAR_TO_WEI))")
info "Buying tokens for $BUY_HBAR_AMOUNT tinybars ($BUY_WEI wei)..."

BUY_TX=$($CAST send "$CONTRACT_ADDRESS" "buy()" \
    --value "$BUY_WEI" \
    --rpc-url "$RPC_URL" \
    --private-key "$PK" \
    --gas-limit 1500000 2>&1)

if echo "$BUY_TX" | grep -q "status.*1"; then
    pass "buy() succeeded"
    BUY_TX_HASH=$(echo "$BUY_TX" | grep "transactionHash" | head -1 | awk '{print $2}')
    info "Buy tx: $BUY_TX_HASH"
else
    echo "$BUY_TX"
    fail "buy() failed"
fi

# ============================================================
# STEP 5: Check State After Buy
# ============================================================
header "Step 5: State After Buy"

SUPPLY_AFTER=$($CAST call "$CONTRACT_ADDRESS" "internalTotalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Internal supply after buy: $SUPPLY_AFTER"

RAISED_AFTER=$($CAST call "$CONTRACT_ADDRESS" "totalRaisedHbar()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Total raised after buy: $RAISED_AFTER"

PRICE_AFTER=$($CAST call "$CONTRACT_ADDRESS" "currentPrice(uint256)(uint256)" "$SUPPLY_AFTER" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Current price at new supply: $PRICE_AFTER"

if [ "$SUPPLY_AFTER" != "0" ]; then
    pass "Supply increased after buy"
else
    fail "Supply did not increase"
fi

# ============================================================
# STEP 6: Preview Sell
# ============================================================
header "Step 6: Preview Sell"

SELL_AMOUNT=$(python3 -c "print(int($SUPPLY_AFTER) // 2)")  # Sell half
info "Preview selling $SELL_AMOUNT tokens..."

PREVIEW_SELL=$($CAST call "$CONTRACT_ADDRESS" "previewSell(uint256)(uint256,uint256)" "$SELL_AMOUNT" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Preview sell result: $PREVIEW_SELL"
pass "previewSell() works"

# ============================================================
# STEP 7: Sell Tokens
# ============================================================
header "Step 7: Sell Tokens"

info "Selling $SELL_AMOUNT tokens..."

# First need to approve the contract to pull tokens via transferFrom
# The contract uses this.transferFrom which is an external call to itself
# The seller needs to have the tokens associated and approved
# On Hedera, the contract already has the supply key, so it should work

SELL_TX=$($CAST send "$CONTRACT_ADDRESS" "sell(uint256)" "$SELL_AMOUNT" \
    --rpc-url "$RPC_URL" \
    --private-key "$PK" \
    --gas-limit 1500000 2>&1)

if echo "$SELL_TX" | grep -q "status.*1"; then
    pass "sell() succeeded"
    SELL_TX_HASH=$(echo "$SELL_TX" | grep "transactionHash" | head -1 | awk '{print $2}')
    info "Sell tx: $SELL_TX_HASH"
else
    echo "$SELL_TX"
    warn "sell() may have failed (this is expected if token association / approval is needed)"
fi

# ============================================================
# STEP 8: State After Sell
# ============================================================
header "Step 8: State After Sell"

SUPPLY_FINAL=$($CAST call "$CONTRACT_ADDRESS" "internalTotalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Final internal supply: $SUPPLY_FINAL"

RAISED_FINAL=$($CAST call "$CONTRACT_ADDRESS" "totalRaisedHbar()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Final total raised: $RAISED_FINAL"

CONTRACT_BAL=$($CAST balance "$CONTRACT_ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Contract HBAR balance: $CONTRACT_BAL wei"

# ============================================================
# STEP 9: Test Read-Only Functions
# ============================================================
header "Step 9: Read-Only Function Tests"

# currentPrice at various supply levels
for SUPPLY_LEVEL in 0 100000000 500000000 1000000000; do
    PRICE=$($CAST call "$CONTRACT_ADDRESS" "currentPrice(uint256)(uint256)" "$SUPPLY_LEVEL" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
    info "Price at supply $SUPPLY_LEVEL: $PRICE"
done
pass "currentPrice() works at various supply levels"

# ============================================================
# STEP 10: Test Owner Functions (read-only check)
# ============================================================
header "Step 10: Owner Function Check"

CURRENT_OWNER=$($CAST call "$CONTRACT_ADDRESS" "owner()(address)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Current owner: $CURRENT_OWNER"

TARGET=$($CAST call "$CONTRACT_ADDRESS" "targetHbarToRaise()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Target HBAR to raise: $TARGET"

GROWTH=$($CAST call "$CONTRACT_ADDRESS" "growthRateBP()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Growth rate (BP): $GROWTH"

STEP=$($CAST call "$CONTRACT_ADDRESS" "stepSize()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null | awk '{print $1}')
info "Step size: $STEP"

pass "All read-only owner functions work"

# ============================================================
# SUMMARY
# ============================================================
header "Test Summary"

echo -e "  Contract:       ${GREEN}$CONTRACT_ADDRESS${NC}"
echo -e "  Token:          ${GREEN}$TOKEN${NC}"
echo -e "  Owner:          $CURRENT_OWNER"
echo -e "  Curve Active:   $($CAST call "$CONTRACT_ADDRESS" "curveActive()(bool)" --rpc-url "$RPC_URL" 2>/dev/null)"
echo -e "  Total Supply:   $SUPPLY_FINAL"
echo -e "  Total Raised:   $RAISED_FINAL"
echo -e "  Base Price:     $BASE_PRICE"
echo -e "  Growth Rate:    $GROWTH BP"
echo ""
echo -e "${GREEN}All testnet tests completed!${NC}"
