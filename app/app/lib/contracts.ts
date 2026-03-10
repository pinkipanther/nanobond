// NanoBond Contract ABIs and Addresses
// Bond marketplace with auto-staking and yield distribution

export const FACTORY_ABI = [
    // createBond
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
    // bondCount
    {
        type: "function",
        name: "bondCount",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    // allBonds
    {
        type: "function",
        name: "allBonds",
        inputs: [{ name: "", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
    },
    // getAllBonds
    {
        type: "function",
        name: "getAllBonds",
        inputs: [],
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
    },
    // getBond
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
    // Events
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
    // ── State reads ──
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
    // ── View helpers ──
    { type: "function", name: "getProgress", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "getTimeRemaining", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "getNextEpoch", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "pendingYield", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "withdrawableHbar", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    {
        type: "function", name: "getBondInfo", inputs: [],
        outputs: [
            { name: "_name", type: "string" },
            { name: "_symbol", type: "string" },
            { name: "_description", type: "string" },
            { name: "_totalSupply", type: "uint256" },
            { name: "_hardCap", type: "uint256" },
            { name: "_softCap", type: "uint256" },
            { name: "_totalRaised", type: "uint256" },
            { name: "_raiseEnd", type: "uint256" },
            { name: "_state", type: "uint8" },
            { name: "_contributorCount", type: "uint256" },
            { name: "_tokenAddress", type: "address" },
            { name: "_yieldRateBps", type: "uint256" },
            { name: "_epochDuration", type: "uint256" },
            { name: "_totalStaked", type: "uint256" },
            { name: "_totalYieldMinted", type: "uint256" },
        ],
        stateMutability: "view",
    },
    // ── Write functions ──
    { type: "function", name: "contribute", inputs: [], outputs: [], stateMutability: "payable" },
    { type: "function", name: "claimBonds", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "distributeYield", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "claimYield", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "stake", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "unstake", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "activate", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "cancel", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "claimRefund", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "checkState", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "withdrawHbar", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    // ── Events ──
    { type: "event", name: "Contributed", inputs: [{ name: "contributor", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "totalRaised", type: "uint256", indexed: false }] },
    { type: "event", name: "BondsClaimed", inputs: [{ name: "claimer", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "YieldDistributed", inputs: [{ name: "amount", type: "uint256", indexed: false }, { name: "timestamp", type: "uint256", indexed: false }] },
    { type: "event", name: "YieldClaimed", inputs: [{ name: "claimer", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "Staked", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "Unstaked", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "HbarWithdrawn", inputs: [{ name: "creator", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "StateChanged", inputs: [{ name: "oldState", type: "uint8", indexed: false }, { name: "newState", type: "uint8", indexed: false }] },
] as const;

// ERC-20 ABI for bond token interactions
export const ERC20_ABI = [
    { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
    { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
    { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

// Replace with your deployed addresses
// Replace with your deployed addresses
export const CONTRACTS = {
    FACTORY: "0xf421C97B3dA3106Cb678605E211eF66C26182158", // Mainnet Factory
};

// Hedera mainnet chain ID
export const HEDERA_CHAIN_ID = 295;
