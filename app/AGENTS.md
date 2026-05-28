# App Instructions

Scope: `app/`.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript with `strict: true`
- ESLint 9 with `eslint-config-next`
- Wagmi, ethers, viem, Magic, WalletConnect, TanStack Query
- Tailwind 4 tooling is installed, but much of the app uses CSS variables and inline styles.

## Commands

```sh
npm run dev
npm run lint
npm run build
```

Use the package manager already represented by the lockfile relevant to the task. Do not churn lockfiles just to run commands.

## Frontend Rules

- Preserve the current app-router structure under `app/app/`.
- Keep wallet code client-side. Components that use browser wallet APIs, `window`, local storage, or wagmi hooks need `"use client"`.
- Keep Hedera network behavior explicit. Do not silently switch mainnet/testnet defaults.
- Do not hardcode private keys or non-public secrets. Only `NEXT_PUBLIC_*` values may be exposed to the browser.
- Prefer existing helpers in `app/app/lib/` before adding new chain, contract, or wallet utilities.
- Avoid broad restyling unless the task is visual design. Match existing CSS variables and component style conventions.
- If changing contract calls, update ABI/address constants and the UI assumptions together.

## Validation

Run at least:

```sh
npm run lint
```

Run `npm run build` for routing, environment, contract ABI, or data-flow changes.
