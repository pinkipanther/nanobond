#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

./generate_hedera_sc_metadata.sh \
  NanoBondFactory=0x7f19d7c0155b2961092a4545a7d9bd1999c3928f \
  NanoProFactory=0x0e78828d3434b5d5e1fc40e5487a7809ea2c27ef \
  NanoBond=0x4e569147a03332e2e908aba258f569231cee849b \
  BondToken=0x911100398131568a58a03ec05635d3632151cdc9 \
  NanoProPool=0x13b0ece5abd2b0aacc202985a75bf1483b088b87

cat <<'EOF'

Upload these files in HashScan:
  verify-bundles/NanoBondFactory/metadata.json
  verify-bundles/NanoProFactory/metadata.json
  verify-bundles/NanoBond/metadata.json
  verify-bundles/BondToken/metadata.json
  verify-bundles/NanoProPool/metadata.json

Constructor args:
  NanoBondFactory:
    _feeRecipient = 0x508673a40ACB491444E29E98BEb4A9a32f38636e

  NanoProFactory:
    none

  NanoBond:
    _name = Testnet Growth Bond
    _symbol = TGB
    _description = Simple testnet raise for Nano Pro end-to-end verification
    _totalSupply = 1000000000000000000000000
    _hardCap = 200000000
    _softCap = 100000000
    _raiseDuration = 259200
    _yieldRateBps = 800
    _epochDuration = 86400
    _platformFeeBps = 250
    _feeRecipient = 0x508673a40ACB491444E29E98BEb4A9a32f38636e
    _creator = 0x508673a40ACB491444E29E98BEb4A9a32f38636e

  BondToken:
    _name = Testnet Growth Bond
    _symbol = TGB
    _minter = 0x4e569147a03332e2e908aba258f569231cee849b
    _initialSupply = 1000000000000000000000000

  NanoProPool:
    _token = 0x911100398131568a58a03ec05635d3632151cdc9
EOF
