// NanoBond V2 contract ABIs, addresses, and Hedera testnet config.

export const HBAR_DECIMALS = 8;
export const TOKEN_DECIMALS = 18;
export const WEIBARS_PER_TINYBAR = 10n ** 10n;

export const HEDERA_NETWORK =
  process.env.NEXT_PUBLIC_HEDERA_NETWORK === "mainnet" ? "mainnet" : "testnet";

export const HEDERA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_NANOBOND_CHAIN_ID ?? (HEDERA_NETWORK === "mainnet" ? "295" : "296"),
);

export const HEDERA_JSON_RPC_URL =
  process.env.NEXT_PUBLIC_HEDERA_JSON_RPC_URL ??
  (HEDERA_NETWORK === "mainnet"
    ? "https://mainnet.hashio.io/api"
    : "https://testnet.hashio.io/api");

export const HEDERA_MIRROR_NODE_URL =
  process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL ??
  (HEDERA_NETWORK === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com");

export const CONTRACTS = {
  FACTORY: process.env.NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS ?? "",
  PRO_FACTORY: process.env.NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS ?? "",
  CURVE: process.env.NEXT_PUBLIC_NANOBOND_CURVE_ADDRESS ?? "",
  CURVE_TOKEN: process.env.NEXT_PUBLIC_NANOBOND_CURVE_TOKEN_ADDRESS ?? "",
};

/** Returns true for a 40-hex EVM address (`0x…`) or a Hedera native ID (`0.0.N`). */
export function isConfiguredAddress(value: string): boolean {
  if (!value) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value) || /^0\.0\.\d+$/.test(value);
}

/** Narrowed guard — true only for 0x EVM addresses (needed for viem readContract). */
export function isEvmAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export const FACTORY_ABI = [
  {
    type: "function",
    name: "createBond",
    inputs: [
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_description", type: "string" },
      { name: "_totalSupply", type: "uint256" },
      { name: "_hardCap", type: "uint256" },
      { name: "_softCap", type: "uint256" },
      { name: "_raiseDuration", type: "uint256" },
      { name: "_yieldRateBps", type: "uint256" },
      { name: "_epochDuration", type: "uint256" },
    ],
    outputs: [
      { name: "bondId", type: "uint256" },
      { name: "bondAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bondCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBond",
    inputs: [{ name: "bondId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "bondContract", type: "address" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "description", type: "string" },
          { name: "yieldRateBps", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BondCreated",
    inputs: [
      { name: "bondId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "bondContract", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "yieldRateBps", type: "uint256", indexed: false },
    ],
  },
] as const;

export const BOND_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "description", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "token", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "creator", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hardCap", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "softCap", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalRaised", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "raiseEnd", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "state", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "yieldRateBps", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "epochDuration", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalStaked", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalYieldMinted", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "contributorCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "contributions", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hasClaimed", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "stakedBalance", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hbarWithdrawn", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTimeRemaining", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getNextEpoch", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "pendingYield", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "withdrawableHbar", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getContributors", inputs: [], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "contribute", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "claimBonds", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "distributeYield", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimYield", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "stake", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "view" },
  { type: "function", name: "unstake", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "pure" },
  { type: "function", name: "activate", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancel", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimRefund", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "checkState", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawHbar", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const TOKEN_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "pendingReward", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "claimRewards", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

export const PRO_FACTORY_ABI = [
  { type: "function", name: "createPool", inputs: [{ name: "token", type: "address" }], outputs: [{ name: "pool", type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "getPool", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "poolCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "PoolCreated", inputs: [{ name: "token", type: "address", indexed: true }, { name: "pool", type: "address", indexed: true }, { name: "poolId", type: "uint256", indexed: false }] },
] as const;

export const PRO_POOL_ABI = [
  { type: "function", name: "token", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "reserveToken", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "reserveHbar", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "spotPrice", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "previewBuy", inputs: [{ name: "hbarIn", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "previewSell", inputs: [{ name: "tokenAmount", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "addLiquidity", inputs: [{ name: "maxTokenAmount", type: "uint256" }, { name: "minLpOut", type: "uint256" }], outputs: [{ name: "lpMinted", type: "uint256" }, { name: "tokenAmount", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "removeLiquidity", inputs: [{ name: "lpAmount", type: "uint256" }, { name: "minHbarOut", type: "uint256" }, { name: "minTokenOut", type: "uint256" }], outputs: [{ name: "hbarOut", type: "uint256" }, { name: "tokenOut", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "buy", inputs: [{ name: "minTokensOut", type: "uint256" }], outputs: [{ name: "tokensOut", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "sell", inputs: [{ name: "tokenAmount", type: "uint256" }, { name: "minHbarOut", type: "uint256" }], outputs: [{ name: "hbarOut", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

export const CURVE_ABI = [
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "currentPrice", inputs: [{ name: "supply", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "previewBuy", inputs: [{ name: "hbarAmount", type: "uint256" }], outputs: [{ name: "tokensToMint", type: "uint256" }, { name: "price", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "previewSell", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ name: "hbarToReturn", type: "uint256" }, { name: "price", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "buy", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "sell", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "internalTotalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "basePrice", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "growthRateBP", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "stepSize", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "curveActive", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "token", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;
