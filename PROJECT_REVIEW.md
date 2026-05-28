# Project Review

Reviewed on 2026-05-27.

## Summary

NanoBond is a mixed frontend and smart-contract repository. The frontend is a Next.js app that reads and writes Hedera-facing contract data. There are two Foundry contract workspaces: one for the marketplace-style NanoBond contracts and one for a Hedera HTS exponential-curve token.

## Current Layout

- `app/`: Next.js app router frontend, wallet providers, contract ABIs, marketplace screens, profile/trade/pro views.
- `contract/`: Foundry marketplace contracts, tests, deployment artifacts, and verification bundles.
- `nanobondtoken/`: Foundry Hedera HTS bonding-curve contract, tests, deployment artifacts, and verification bundles.
- `scripts/`: ignored operational scripts and generated-looking wallet/key artifacts. Treat as sensitive.

## Review Notes

- The frontend has many local modifications at the time of review. Avoid broad formatting or restyling until those changes are understood.
- The root `.gitignore` is minimal, while nested `.gitignore` files do ignore most app and Foundry generated output.
- Existing tracked broadcast artifacts suggest deployments are part of the historical record. Do not delete them casually.
- `scripts/` contains wallet/key-looking filenames and should be handled as sensitive operational tooling.
- App validation is centered on `npm run lint` and `npm run build`.
- Contract validation is centered on `forge test` and `forge build` in each Foundry workspace.

## Recommended Next Cleanup

- Decide whether tracked broadcast artifacts should remain source-controlled as deployment records.
- Add safe `.env.example` files for each workspace if onboarding is a priority.
- Add a root README that explains the three workspaces and common commands.
- Consider a secret scan and history review before publishing or sharing the repository.
