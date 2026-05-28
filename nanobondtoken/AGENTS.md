# Nanobond Token Instructions

Scope: `nanobondtoken/`.

## Stack

Foundry workspace for `NanobondExponentialCurve`, a Hedera HTS-based fungible token and bonding-curve contract.

Important files:

- `src/NanobondExponentialCurve.sol`
- `script/DeployNanobondExponentialCurve.s.sol`
- `test/NanobondExponentialCurve.t.sol`
- `remappings.txt`

`lib/hedera-smart-contracts` and `lib/forge-std` are vendor dependencies.

## Commands

```sh
forge test
forge build
forge fmt
```

Some HTS behavior requires Hedera network precompiles and may not be fully reproducible in local unit tests. State this clearly when validation is limited.

## Contract Rules

- Do not edit vendor libraries, generated output, caches, or broadcast artifacts unless explicitly requested.
- Do not run broadcast scripts or live buy/sell scripts without an explicit user request.
- Keep HTS response-code checks explicit.
- Preserve the token initialization lifecycle: deploy contract first, then initialize HTS token.
- Add or update tests for price math, overflow handling, buy/sell accounting, ownership, withdrawals, curve deactivation, and token initialization assumptions.
- Be careful with units: `TINYBARS_PER_HBAR`, `decimals`, and `stepSize` are central to price math.

## Validation

For code changes, run:

```sh
forge test
forge build
```
