import { parseAbi } from 'viem';

// Contract ABIs for NanoBond platform
// These are simplified ABIs - replace with full ABIs from forge build output

export const FACTORY_ABI = parseAbi([
  "function createLaunch(string _name, string _symbol, uint256 _totalSupply, uint256 _hardCap, uint256 _softCap, uint256 _launchDuration, uint256 _lpPercent, uint256 _stakingRewardPercent, uint256 _stakingDuration) external returns (uint256, address, address)",
  "function launches(uint256) external view returns (address launchContract, address stakingContract, address creator, string name, string symbol, uint256 createdAt, bool active)",
  "function launchCount() external view returns (uint256)",
  "function getLaunch(uint256 _launchId) external view returns ((address launchContract, address stakingContract, address creator, string name, string symbol, uint256 createdAt, bool active))",
  "function getAllLaunches() external view returns (address[])",
  "event LaunchCreated(uint256 indexed launchId, address indexed launchContract, address indexed stakingContract, address creator, string name, string symbol, uint256 hardCap, uint256 totalSupply)"
]);

export const LAUNCH_ABI = parseAbi([
  "function contribute() external payable",
  "function finalize() external",
  "function claimTokens() external",
  "function claimRefund() external",
  "function checkState() external",
  "function cancel() external",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function hardCap() external view returns (uint256)",
  "function softCap() external view returns (uint256)",
  "function totalRaised() external view returns (uint256)",
  "function launchEnd() external view returns (uint256)",
  "function state() external view returns (uint8)",
  "function contributorCount() external view returns (uint256)",
  "function contributions(address) external view returns (uint256)",
  "function hasClaimed(address) external view returns (bool)",
  "function tokensForSale() external view returns (uint256)",
  "function tokensForLP() external view returns (uint256)",
  "function tokensForStaking() external view returns (uint256)",
  "function getProgress() external view returns (uint256)",
  "function getTimeRemaining() external view returns (uint256)",
  "function getTokenPrice() external view returns (uint256)",
  "function token() external view returns (address)",
  "function creator() external view returns (address)",
  "function getLaunchInfo() external view returns (string, string, uint256, uint256, uint256, uint256, uint256, uint8, uint256, address)",
  "function withdrawLP() external",
  "function withdrawRaisedAmount() external",
  "function withdrawPendingHbar() external",
  "event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised)",
  "event LaunchFinalized(address indexed lpPair, uint256 lpHbar, uint256 lpTokens)",
  "event TokensClaimed(address indexed claimer, uint256 amount)",
  "event RefundClaimed(address indexed claimer, uint256 amount)",
  "event LaunchCancelled()",
  "event StateChanged(uint8 oldState, uint8 newState)",
  "event LPCreationFailed(string reason)",
  "event RaisedAmountWithdrawn(address indexed admin, uint256 amount, uint8 state)"
]);

export const STAKING_ABI = parseAbi([
  "function stake(uint256 _amount) external",
  "function unstake(uint256 _amount) external",
  "function claimReward() external",
  "function exit() external",
  "function earned(address _account) external view returns (uint256)",
  "function stakedBalance(address) external view returns (uint256)",
  "function totalStaked() external view returns (uint256)",
  "function totalRewards() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "function stakingEnd() external view returns (uint256)",
  "function totalStakers() external view returns (uint256)",
  "function getAPR() external view returns (uint256)",
  "function getStakingInfo() external view returns (address, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getUserInfo(address _user) external view returns (uint256, uint256, bool)",
  "function initialized() external view returns (bool)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 reward)"
]);

export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
]);

// Replace with your deployed addresses
export const CONTRACTS = {
  FACTORY: "0x5fD07eF11E9613910bBf5d6Fd6d5523e4ef21DFD", // Hedera testnet deployment
  DEX_ROUTER: "0x0000000000000000000000000000000000004b40", // SaucerSwap router
};

// Hedera Network Config
export const HEDERA_CHAIN = {
  chainId: "0x128", // 296 = Hedera Testnet
  chainName: "Hedera Testnet",
  rpcUrls: ["https://testnet.hashio.io/api"],
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18,
  },
  blockExplorerUrls: ["https://hashscan.io/testnet"],
};

export const HEDERA_MAINNET = {
  chainId: "0x127", // 295 = Hedera Mainnet
  chainName: "Hedera Mainnet",
  rpcUrls: ["https://mainnet.hashio.io/api"],
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18,
  },
  blockExplorerUrls: ["https://hashscan.io/mainnet"],
};
