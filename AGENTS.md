# NanoBond Project Instructions

## Project Shape

This repository contains three main work areas:

- `app/`: Next.js 16 / React 19 frontend for NanoBond, wallet connections, bond marketplace views, and pro trading screens.
- `contract/`: Foundry workspace for the ERC-20-backed NanoBond marketplace contracts.
- `nanobondtoken/`: Foundry workspace for the Hedera HTS `NanobondExponentialCurve` contract and deployment scripts.

Treat `contract/lib/`, `nanobondtoken/lib/`, generated `out/`, `cache/`, `.next/`, and dependency folders as vendor or generated content unless the task explicitly targets them.

## Working Rules

- Keep changes small, reviewable, and scoped to the requested area.
- Do not overwrite existing local edits. This workspace often has modified frontend files.
- Do not add dependencies without explicit user approval.
- Do not read, print, commit, or copy private keys, seed phrases, wallet exports, `.env` values, or script-generated account files.
- Never run live deployment, wallet funding, token transfer, or broadcast scripts unless the user explicitly requests that exact action.
- Prefer deleting stale code and reusing existing helpers before adding abstractions.
- When changing contract behavior, add or update Foundry tests for the affected invariant.
- When changing frontend behavior, validate with `npm run lint` and `npm run build` from `app/` when feasible.

## Validation Commands

Use the narrowest validation that proves the change:

```sh
cd app && npm run lint
cd app && npm run build
cd contract && forge test
cd contract && forge build
cd nanobondtoken && forge test
cd nanobondtoken && forge build
```

For Solidity formatting:

```sh
cd contract && forge fmt
cd nanobondtoken && forge fmt
```

## Repository Risks To Preserve

- The app talks to Hedera mainnet and testnet; chain IDs and RPC URLs must stay explicit.
- `app/app/lib/contracts.ts` contains deployed contract addresses and ABIs; update it only when contract deployments or ABI changes require it.
- Broadcast artifacts are tracked in the contract workspaces. Do not delete or regenerate them unless the task is deployment-artifact maintenance.
- The root `.gitignore` ignores `scripts/`, but existing script artifacts include wallet/key-looking files. Treat the whole directory as sensitive operational tooling.

## Commit Messages

If asked to commit, use the Lore Commit Protocol: intent-first subject, short rationale body, and useful trailers such as `Tested:`, `Not-tested:`, `Confidence:`, and `Scope-risk:`.
