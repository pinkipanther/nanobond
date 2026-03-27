# Nanobond Token

Foundry project for a Hedera-based `NanobondExponentialCurve` contract that deploys first, then initializes an HTS fungible token and sells it on an exponential bonding curve.

## Files

- Contract: `src/NanobondExponentialCurve.sol`
- Deploy script: `script/DeployNanobondExponentialCurve.s.sol`
- Remappings: `remappings.txt`

## Build

```sh
~/.foundry/bin/forge build
```

## Environment

Create a `.env` file with at least:

```sh
PRIVATE_KEY=your_private_key_without_0x_or_with_0x
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
TOKEN_CREATE_FEE_TINYBAR=100000000
```

Notes:
- `PRIVATE_KEY` must control a funded Hedera EVM account on testnet.
- `TOKEN_CREATE_FEE_TINYBAR` is the HBAR value sent into `initializeToken()` for HTS token creation.
- If you omit `HEDERA_TESTNET_RPC_URL`, you can pass the RPC URL directly on the command line.

## Deploy To Hedera Testnet

```sh
bash -lc 'set -a; source .env; set +a; ~/.foundry/bin/forge script script/DeployNanobondExponentialCurve.s.sol:DeployNanobondExponentialCurveScript --rpc-url "$HEDERA_TESTNET_RPC_URL" --broadcast'
```

If you prefer not to keep the RPC URL in `.env`, use:

```sh
bash -lc 'set -a; source .env; set +a; ~/.foundry/bin/forge script script/DeployNanobondExponentialCurve.s.sol:DeployNanobondExponentialCurveScript --rpc-url https://testnet.hashio.io/api --broadcast'
```

## Verify Setup

```sh
~/.foundry/bin/forge build
```

After deployment, Foundry writes the transaction artifacts under `broadcast/`.

The deployment script performs two on-chain actions in one broadcast session:
- deploy `NanobondExponentialCurve`
- call `initializeToken()` with the configured HTS creation fee
