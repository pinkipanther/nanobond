# V2 Contract Instructions

Scope: `v2/contract/`.

## Stack

Foundry workspace for the V2 testnet NanoBond marketplace contracts:

- `src/NanoBondFactory.sol`
- `src/NanoBond.sol`
- `src/BondToken.sol`
- tests in `test/`
- deployment script in `script/Deploy.s.sol`

OpenZeppelin and forge-std under `lib/` are vendor dependencies.

## V2 Priorities

- Fix HBAR unit handling so frontend, tests, and contracts agree on tinybar/weibar expectations.
- Ensure every activation path performs the same accounting: platform fee, creator token allocation, state transition, and events.
- V2.1 rewards belong to ERC-20 bond token holders; staking is deprecated and should not be reintroduced without a new design.
- Nano Pro secondary markets use `NanoProFactory` and `NanoProPool` for HBAR/ERC-20 liquidity.
- Keep V2 testnet deployments separate from V1 mainnet artifacts.
- Keep deployment addresses out of source when possible; use app env/config surfaces for V2 testnet addresses.

## Contract Rules

- Do not edit `lib/`, `out/`, `cache/`, or broadcast artifacts unless explicitly requested.
- Do not run `forge script --broadcast` without an explicit user request.
- Preserve state-machine invariants around `RAISING`, `ACTIVE`, `MATURED`, `FAILED`, and `CANCELLED`.
- Add tests for contribution accounting, caps, refunds, activation paths, staking, rewards, withdrawals, fees, and creator/admin permissions.
- Keep revert reasons stable unless changing the public contract surface is part of the task.

## Validation

Run:

```sh
forge test
forge build
```
