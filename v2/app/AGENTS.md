# V2 App Instructions

Scope: `v2/app/`.

## Stack Target

- Next.js 16 App Router
- React 19
- TypeScript with `strict: true`
- Reown AppKit and `@hashgraph/hedera-wallet-connect` for wallet pairing/session management
- `@hashgraph/sdk` and `@hiero-ledger/sdk` for Hedera transaction construction and signing
- Wagmi and Viem for core React wallet hooks and EVM capability
- TanStack Query may remain for app data fetching if useful

The V2 app utilizes Reown AppKit (WalletConnect) alongside Wagmi for wallet connection and transaction signing. Do not use deprecated libraries like HashConnect, nor unsupported tools like RainbowKit, Magic, Privy, Dynamic, or thirdweb.

## Wallet Architecture

- Provide one dashboard-level `WalletProvider`.
- Expose wallet state through a local `useWallet()` hook.
- Build a `ConnectWalletButton` that reflects disconnected, pairing, connected, wrong-network, pending, and error states.
- Keep all wallet/session code client-side.
- Route native Hedera writes through `universalProvider.hedera_signAndExecuteTransaction`, passing base64 encoded transactions.
- Keep Hedera account ID, EVM address, network, balance, connector status, pending transaction, and last error in the wallet state.

## Environment

Required or planned public env vars:

```sh
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_HEDERA_JSON_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS=
NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS=
NEXT_PUBLIC_NANOBOND_CHAIN_ID=296
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Do not add browser-readable secrets. WalletConnect project IDs are public and expected to be provided in V2.

## Frontend Rules

- Preserve the app-router layout under `app/`.
- Prefer clear dashboard UI over marketing surfaces.
- When wallet state changes, update the visible UI instead of hiding errors in console output.
- Keep contract units explicit: Hedera HBAR/tinybar values use 8 decimals unless a specific EVM JSON-RPC call requires weibar conversion.
- Replace V1 hardcoded mainnet addresses with testnet env/config values.
- If changing contract calls, update ABI/address constants, wallet transaction code, and UI copy together.

## Validation

Run:

```sh
npm run lint
npm run build
```
