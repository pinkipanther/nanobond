# NanoBond V2 Instructions

Scope: `v2/`.

V2 is the testnet rebuild of the NanoBond app and marketplace contracts. Keep V2 isolated from the root V1 app unless the user explicitly asks to port a change back.

## Project Layout

```
v2/
├── AGENTS.md              ← you are here
├── TODO.md                ← feature/task tracker with completion checkboxes
├── app/                   ← Next.js 16 / React 19 frontend
│   ├── AGENTS.md          ← app-specific instructions (stack, env, frontend rules)
│   └── app/
│       ├── components/    ← shared UI (Navbar, Hero, BondCard, BondDetail,
│       │                    ConnectWallet, CreateBond, PriceChart, GameEmbed)
│       ├── lib/           ← core libraries:
│       │   ├── wallet.tsx        — WalletProvider, useWallet(), dual-adapter AppKit init
│       │   ├── contracts.ts      — ABIs, deployed addresses, Hedera chain config
│       │   ├── contractActions.ts — Hedera SDK transaction builders
│       │   ├── hooks.ts          — useBonds, useBondDetail, useBondContributors
│       │   └── usePriceHistory.ts
│       ├── bonds/         ← /bonds listing + /bonds/[address] detail
│       ├── create/        ← bond creation form
│       ├── trade/         ← trade page
│       ├── pro/           ← pro trading terminal (own layout, dark theme CSS overrides)
│       │   ├── components/ — ProTerminal, MarketSelector, MarketStats, TradeForm
│       │   └── lib/markets.ts — useNanoProMarkets (pool discovery, LP data, rewards)
│       ├── portfolio/     ← user portfolio page
│       ├── analytics/     ← analytics dashboard
│       ├── admin/login/   ← admin login
│       └── debug/         ← debug/development page
└── contract/              ← Foundry workspace
    ├── AGENTS.md          ← contract-specific instructions (invariants, rules)
    ├── src/
    │   ├── NanoBondFactory.sol  — creates bonds, tracks registry
    │   ├── NanoBond.sol         — bond lifecycle state machine
    │   ├── BondToken.sol        — ERC-20 with holder-based reward distribution
    │   ├── NanoProFactory.sol   — creates AMM pools
    │   ├── NanoProPool.sol      — constant-product HBAR/ERC-20 pool (30 bps fee)
    │   └── IHederaTokenService.sol
    ├── test/
    │   ├── NanoBond.t.sol
    │   └── NanoProPool.t.sol
    ├── script/            ← deployment scripts (do not broadcast without approval)
    └── verify-bundles/    ← HashScan/Bytecode verification metadata
```

## Tech Stack (App)

| Layer | Package | Notes |
|-------|---------|-------|
| Framework | Next.js 16.1.6, App Router | Turbopack default |
| UI | React 19.2.3, Framer Motion, lightweight-charts | CSS variables for theming |
| Styling | Tailwind CSS 4.3 via PostCSS | |
| Wallet UI | Reown AppKit 1.8.x | Dual-adapter: `WagmiAdapter` + `HederaAdapter` |
| Wallet Connect | `@walletconnect/universal-provider` 2.x | Powers native Hedera signing |
| Hedera Native | `@hashgraph/hedera-wallet-connect` 2.x, `@hashgraph/sdk` 2.41.0 | Transaction construction + `hedera_signAndExecuteTransaction` |
| Hedera Hiero | `@hiero-ledger/sdk` 2.x | Additional Hedera SDK |
| EVM Reads | Viem 2.x via `publicClient.readContract` | Hashio JSON-RPC transport |
| EVM Writes | `@wagmi/core` 3.x `sendTransaction` | Through Wagmi adapter |
| Data | `@tanstack/react-query` 5.x | App data fetching |
| Math | `bignumber.js` 9.x, viem `parseUnits`/`formatUnits` | Decimal conversions |

## Tech Stack (Contracts)

- Solidity 0.8.20 with `via_ir = true`, optimizer 200 runs
- OpenZeppelin contracts (local under `lib/`, not a managed dependency)
- forge-std for tests
- State machine: `RAISING` → `ACTIVE` → `MATURED` / `FAILED` / `CANCELLED`

## Wallet Architecture

The app uses a single `WalletProvider` (dynamically imported to avoid SSR) that initializes:

1. **WagmiAdapter** — EVM chain adapter for AppKit, provides `wagmiConfig`
2. **HederaAdapter** — native Hedera chain adapter for AppKit
3. **HederaProvider** (Universal Provider) — powers `hedera_signAndExecuteTransaction`
4. **AppKit modal** — created with both adapters + the Universal Provider

### Dual Transaction Paths

- **Native Hedera writes** (`sendTx`): Build a `ContractExecuteTransaction` via `@hashgraph/sdk`, freeze it with node IDs from `hedera_getNodeAddresses()`, encode to base64 via `transactionToBase64String()`, and send through `universalProvider.hedera_signAndExecuteTransaction`.
- **EVM writes** (`sendEvmTx`): Use `@wagmi/core` `sendTransaction` for direct EVM contract calls.
- **On-chain reads**: Viem `publicClient.readContract` over Hashio JSON-RPC (`HEDERA_JSON_RPC_URL`).

### Account Resolution

After pairing, the provider session yields either a native `0.0.N` account ID or an EVM `0x…` address. Mirror node lookups (`HEDERA_MIRROR_NODE_URL`) resolve the complementary identifier and balance.

### Wallet State Surface

`useWallet()` exposes: `status` (idle/initializing/pairing/connected/wrong-network/error), `accountId`, `evmAddress`, `balanceTinybar`, `pendingTx`, `lastTxId`, `error`, `connect()`, `disconnect()`, `refreshBalance()`, `sendTx()`, `sendEvmTx()`, `clearError()`.

## Unit Model

| Unit | Decimals | Usage |
|------|----------|-------|
| tinybar | 8 | HBAR amounts in contract params, UI display, env config |
| weibar | 18 (10¹⁰ per tinybar) | EVM JSON-RPC reads via viem, Hedera system contract calls |
| token units | 18 | ERC-20 bond token amounts |

`WEIBARS_PER_TINYBAR = 10n ** 10n` is the conversion constant in `contracts.ts`.

## Environment Variables

All public, no secrets:

```sh
NEXT_PUBLIC_HEDERA_NETWORK=testnet              # or mainnet
NEXT_PUBLIC_HEDERA_JSON_RPC_URL=                # defaults by network
NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL=             # defaults by network
NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS=           # 0x EVM address
NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS=            # 0x EVM address (optional, not yet deployed)
NEXT_PUBLIC_NANOBOND_CHAIN_ID=296               # 296 testnet / 295 mainnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=           # Reown/AppKit project ID
```

## Current State (from TODO.md)

**Completed:**
- Wallet migration from HashConnect to Reown AppKit + Wagmi
- Dual-adapter wallet init with Universal Provider
- Native Hedera + EVM transaction signing paths
- Contract fixes: unit model, activation paths, reward accounting, staking deprecation
- V2.1 holder-based rewards on `BondToken` (staking removed)
- Nano Pro AMM: `NanoProFactory`, `NanoProPool`, tests, app integration, live UI
- Pro terminal: pool discovery, creation, liquidity, buy/sell, LP removal, reward claims
- Analytics and portfolio pages redesigned
- ESLint clean, Next.js production build passing

**Remaining:**
- Deploy `NanoProFactory` on testnet and set `NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS`
- Manual AppKit testing: pairing, reconnect, disconnect, wrong-network, session management
- Manual Nano Pro e2e testing on Hedera testnet

## Known Workarounds

- **Turbopack `accounts` module error**: Viem's optional `accounts` package causes Turbopack compile failures. Worked around via `tsconfig.json` path alias `"accounts": ["./empty.ts"]` and `package.json` `browser: { accounts: false }`. The `empty.ts` file exports nothing.
- **Pro layout theme**: The `/pro` route uses its own `layout.tsx` that overrides CSS variables inline for a dark trading-terminal aesthetic. Do not move these to the global stylesheet without preserving the scoped overrides.
- **Default gas**: All Hedera `ContractExecuteTransaction` calls use `setGas(10_000_000)` — Hedera requires explicit gas limits.

## Work Rules

- Do not copy V1 wallet architecture forward.
- Do not expose private keys, mnemonics, or `.env` values.
- Do not add dependencies without explicit user approval.
- Keep testnet contract addresses and Hedera network configuration in explicit env/config surfaces (`app/app/lib/contracts.ts`).
- Update app ABI definitions in `contracts.ts` together with any contract interface changes.
- Update transaction builders in `contractActions.ts` when contract signatures change.
- When changing contract behavior, add or update Foundry tests in `v2/contract/test/` before claiming behavior is fixed.
- When changing frontend behavior, validate with lint and build.
- Do not edit `lib/`, `out/`, `cache/`, or broadcast artifacts in `v2/contract/` unless explicitly requested.
- Do not run `forge script --broadcast` without an explicit user request.
- Prefer deleting stale code and reusing existing helpers before adding abstractions.
- Keep wallet/session code client-side (`"use client"`).

## Validation

Use the narrowest check that proves the change:

```sh
# App
cd v2/app && npm run lint
cd v2/app && npm run build

# Contracts
cd v2/contract && forge test
cd v2/contract && forge build
cd v2/contract && forge fmt
```
