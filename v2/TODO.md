# NanoBond V2 TODO

## Wallet And UI Migration

- [x] Migrate away from deprecated HashConnect to Reown AppKit.
- [x] Integrate `@hashgraph/hedera-wallet-connect` for native Hedera WalletConnect v2 support.
- [x] Reinstate Wagmi and Viem dependencies to support AppKit UI and potential EVM chains.
- [x] Create dashboard-level `WalletProvider` utilizing Universal Provider.
- [x] Create local `useWallet()` hook.
- [x] Create `ConnectWalletButton` leveraging the modern AppKit modal experience.
- [x] Route Hedera writes through `universalProvider.hedera_signAndExecuteTransaction` converting base64 transactions.
- [x] Redesign Analytics and Profile pages with premium glassmorphic bento-box layouts.
- [x] Fix Turbopack compilation errors caused by optional Viem packages (`accounts`).
- [ ] Manually test AppKit pairing, reconnect, and session management on Hedera testnet.

## Contract Fixes

- [x] Decide and document the canonical unit model for HBAR/tinybar/weibar across V2.
- [x] Fix bond contribution/cap unit mismatch between frontend and contracts.
- [x] Make hard-cap auto-activation and deadline activation run the same fee and creator-token accounting as manual activation.
- [x] Fix reward accounting so stake/unstake cannot erase pending yield.
- [x] Add regression tests for all activation paths.
- [x] Add regression tests for pending rewards before and after stake changes.
- [x] Run `forge test` and `forge build` in `v2/contract`.

## V2.1 Holder Rewards And Nano Pro

- [x] Keep launched bond tokens as ERC-20 tokens for V2.1.
- [x] Replace staking-gated rewards with holder-based reward distribution on `BondToken`.
- [x] Keep creator-supplied APR at bond launch and distribute epoch rewards to eligible token holders.
- [x] Deprecate `stake` and `unstake` while preserving the legacy surface as reverting methods.
- [x] Add transfer regression tests proving pending rewards are preserved and future rewards follow token ownership.
- [x] Add `NanoProFactory` and `NanoProPool` for secondary HBAR/ERC-20 markets.
- [x] Add Nano Pro tests for pool creation, liquidity, buy, sell, and liquidity removal.
- [x] Add app contract config and transaction builders for Nano Pro pools.
- [x] Replace the mock pro terminal with live pool discovery, pool creation, liquidity, buy/sell, LP removal, and reward claim flows.
- [x] Update V2 UI copy away from auto-staking/APY toward transferable tokens, holder rewards, and creator APR.
- [ ] Deploy `NanoProFactory` on Hedera testnet and set `NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS`.
- [ ] Manually test HashConnect pool creation, approval, liquidity, buy/sell, LP removal, and reward claim transactions on Hedera testnet.

## App Validation

- [x] Remove or replace V1 debug/demo code that blocks lint.
- [x] Run ESLint in `v2/app`.
- [x] Run Next production build in `v2/app`.
- [ ] Manually test AppKit pairing, reconnect, disconnect, wrong-network messaging, and transaction signing on Hedera testnet.
