# HeadStart Smart Contract Audit Report

## 1. Overview
**Scope:** `HeadStartFactory.sol`, `HeadStartLaunch.sol`, `HeadStartStaking.sol`
**Objective:** Identify vulnerabilities, logical flaws, and security risks in the token launchpad and staking contracts.

## 2. Executive Summary
The review identified several critical issues primarily located in the `HeadStartLaunch.sol` contract's finalization logic. The most severe vulnerabilities involve the permanent locking of user and creator assets if Decentralized Exchange (DEX) liquidity provision fails, partially consumes inputs, or if the creator address rejects HBAR transfers. 

## 3. Findings

### High Severity

#### [H-1] Unused `tokensForLP` are permanently locked if DEX liquidity creation fails
**Description:** 
In `HeadStartLaunch.sol`, the `finalize()` function attempts to add liquidity using `tokensForLP` and `hbarForLP`. If the `dexRouter` is `address(0)` or the `try IDEXRouter(dexRouter).addLiquidityETH` block fails, the code reallocates `hbarForLP` to the creator (`hbarForCreator += hbarForLP;`). However, it completely ignores `tokensForLP`. These tokens (20% of the total token supply) remain permanently locked in the `HeadStartLaunch` contract because they are never transferred or burnt.
**Recommendation:** 
If LP creation fails or is skipped, transfer the `tokensForLP` to the creator alongside the `hbarForLP`, or explicitly burn them.

#### [H-2] Excess HBAR and tokens from partial `addLiquidityETH` consumption are permanently locked
**Description:** 
The `finalize()` function calls `addLiquidityETH` to create the initial liquidity pair. If the pair already exists (e.g., created by a malicious front-runner with a tiny amount of liquidity) at a different price ratio, the DEX router will not consume the full amounts of HBAR and tokens provided. It will return the excess HBAR to the contract (triggering the `receive()` fallback). However, `finalize()` ignores the returned values from `addLiquidityETH` (`amountToken`, `amountETH`, `liquidity`) and proceeds to calculate `hbarForCreator` based purely on the theoretical `hbarForLP`. The refunded HBAR and unused tokens are permanently locked.
**Recommendation:** 
Capture the return values of `addLiquidityETH`. Refund the unspent HBAR (`hbarForLP - amountETH`) to the creator. Handle the unspent tokens (`tokensForLP - amountToken`) by either burning them or sending them to the creator.

#### [H-3] Denial of Service (DoS) in `finalize()` if the creator cannot receive HBAR
**Description:** 
In `finalize()`, HBAR is sent to the `creator` using `(bool sent, ) = payable(creator).call{value: hbarForCreator}(""); require(sent, "HeadStartLaunch: creator transfer failed");`. If the `creator` is a smart contract that does not implement a `receive()` function, or if an attacker intentionally reverts it, the `finalize()` function will revert. This prevents the state from ever transitioning to `FINALIZED`, permanently locking all contributors' funds (they can neither claim tokens nor claim refunds).
**Recommendation:** 
Implement a "pull-over-push" pattern for the creator's HBAR withdrawal, or remove the `require(sent)` and track the creator's failed transfer balance in a mapping to allow them to manually withdraw it later.

### Medium Severity

#### [M-1] `lpPair` state variable is never assigned
**Description:** 
The `HeadStartLaunch` contract defines `address public lpPair;` but never assigns it a value during or after LP creation. Consequently, the `LaunchFinalized(lpPair, hbarForLP, tokensForLP)` event is always emitted with `lpPair` as `address(0)`.
**Recommendation:** 
Assign the `lpPair` by querying the DEX factory within `finalize()`: 
`lpPair = IDEXFactory(IDEXRouter(dexRouter).factory()).createPair(address(token), WETH);` (or by fetching it if it already exists).

#### [M-2] `getTokenPrice()` returns an inaccurate fixed value
**Description:** 
The `getTokenPrice()` view function always returns `(hardCap * 1e18) / tokensForSale`. However, if the launch concludes by passing the `softCap` but falls short of the `hardCap`, `claimTokens()` proportionally distributes all `tokensForSale` based on the actual `totalRaised`. This means contributors receive tokens at an effective price of `totalRaised / tokensForSale`, making the `getTokenPrice()` output incorrect and potentially misleading for UIs.
**Recommendation:** 
Update `getTokenPrice()` to reflect the dynamic price based on the current or final `totalRaised`:
`return (totalRaised > 0 ? (totalRaised * 1e18) / tokensForSale : (hardCap * 1e18) / tokensForSale);`

### Low / Informational Severity

#### [L-1] Initial staking rewards are permanently locked if there's a delay before the first stake
**Description:** 
`HeadStartStaking` uses a standard continuous reward mechanism where `lastUpdateTime` is set to `block.timestamp` upon `initialize()`. Any time elapsed between `initialize()` and the first user's `stake()` results in rewards that are calculated but never distributed (they become locked dust).
**Recommendation:** 
Consider setting `lastUpdateTime` to `block.timestamp` only upon the very first deposit, or document this behavior as expected for this staking model.

#### [I-1] `tokensForLP` is hardcoded to 20%
**Description:** 
The factory allows setting an `_lpPercent` parameter which controls the percentage of *raised HBAR* sent to the LP. However, the percentage of *total token supply* allocated to the LP is hardcoded at 20% (`tokensForLP = (_totalSupply * 2000) / 10000;`). This mismatch could lead to heavily skewed initial LP pricing depending on the user's `_lpPercent` input.
**Recommendation:** 
Verify if this asymmetry is intended. If `lpPercent` should dictate both HBAR and token allocations uniformly, use the dynamic variable for `tokensForLP` as well.

---
opus 4.6 and gemini 3.1 reviewed
