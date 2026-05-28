# Contract Instructions

Scope: `contract/`.

## Stack

Foundry workspace for the NanoBond marketplace contracts:

- `src/NanoBondFactory.sol`
- `src/NanoBond.sol`
- `src/BondToken.sol`
- tests in `test/`
- deployment script in `script/Deploy.s.sol`

OpenZeppelin and forge-std under `lib/` are vendor dependencies.

## Commands

```sh
forge test
forge build
forge fmt
```

Use `forge test --match-test <name>` for focused verification while iterating, then run the broader suite before claiming completion.

## Contract Rules

- Do not edit `lib/`, `out/`, `cache/`, or broadcast artifacts unless the task explicitly targets dependencies or deployment artifacts.
- Do not run `forge script --broadcast` or mainnet/testnet deployment commands without an explicit user request.
- Preserve state-machine invariants around `RAISING`, `ACTIVE`, `MATURED`, `FAILED`, and `CANCELLED`.
- Add tests for changes to contribution accounting, caps, refunds, staking, rewards, withdrawals, fees, or creator/admin permissions.
- Treat HBAR units in tests carefully. Existing tests use EVM wei-style values.
- Keep revert reasons stable unless the task includes changing the user/developer-facing contract surface.

## Validation

For code changes, run:

```sh
forge test
forge build
```
