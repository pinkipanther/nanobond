# NanoBond V2 Instructions

Scope: `v2/`.

V2 is the testnet rebuild of the NanoBond app and marketplace contracts. Keep V2 isolated from the root V1 app unless the user explicitly asks to port a change back.

## Target Direction

- Testnet-first Hedera experience.
- App wallet stack uses Reown AppKit and `@hashgraph/hedera-wallet-connect` alongside Wagmi.
- HashConnect is deprecated and has been removed from V2.
- Use a dashboard-level `WalletProvider` and `useWallet()` flow utilizing the Universal Provider.
- Route transaction signing through `universalProvider.hedera_signAndExecuteTransaction` or standard Wagmi hooks for EVM.
- Keep the UI updated with wallet connection state, network/account status, pending transactions, errors, and success feedback.

## Work Rules

- Do not copy V1 wallet architecture forward.
- Do not expose private keys, mnemonics, or `.env` values.
- Keep testnet contract addresses and Hedera network configuration in explicit env/config surfaces.
- Update app ABI/address assumptions together with contract changes.
- For contract changes, add or update Foundry tests before claiming behavior is fixed.

## Validation

Use the narrowest checks that prove the change:

```sh
cd v2/app && npm run lint
cd v2/app && npm run build
cd v2/contract && forge test
cd v2/contract && forge build
```
