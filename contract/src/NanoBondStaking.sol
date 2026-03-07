// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title NanoBondStaking
 * @notice Staking contract for launched tokens - stake to earn rewards
 * @dev Reward distribution based on time-weighted staking shares
 */
contract NanoBondStaking {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════
    //                         STORAGE
    // ═══════════════════════════════════════════════════════════════

    address public owner;
    IERC20 public stakingToken;
    bool public initialized;

    // Reward config
    uint256 public rewardRate;          // Rewards per second
    uint256 public stakingDuration;     // Total staking reward period
    uint256 public stakingEnd;          // When staking rewards end
    uint256 public totalRewards;        // Total reward tokens allocated
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    // Staking state
    uint256 public totalStaked;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // Stats
    uint256 public totalStakers;
    mapping(address => bool) public isStaker;

    // ═══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════════

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event StakingInitialized(address token, uint256 totalRewards, uint256 duration);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════════════════════
    //                        MODIFIERS
    // ═══════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "NanoBondStaking: not owner");
        _;
    }

    modifier onlyInitialized() {
        require(initialized, "NanoBondStaking: not initialized");
        _;
    }

    modifier updateReward(address _account) {
        if (totalStaked == 0 && stakingEnd == 0 && initialized) {
            // Address [L-1]: Delay staking start until first stake
            lastUpdateTime = block.timestamp;
            stakingEnd = block.timestamp + stakingDuration;
        }

        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════
    //                       CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(uint256 _stakingDuration) {
        owner = msg.sender;
        stakingDuration = _stakingDuration;
    }

    // ═══════════════════════════════════════════════════════════════
    //                      INITIALIZE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Initialize staking with token and rewards
     * @param _token Address of the staking/reward token
     * @param _totalRewards Total rewards to distribute
     */
    function initialize(
        address _token,
        uint256 _totalRewards
    ) external onlyOwner {
        require(!initialized, "NanoBondStaking: already initialized");
        require(_token != address(0), "NanoBondStaking: zero token");
        require(_totalRewards > 0, "NanoBondStaking: zero rewards");

        stakingToken = IERC20(_token);
        totalRewards = _totalRewards;
        rewardRate = _totalRewards / stakingDuration;
        initialized = true;

        // Pull reward tokens from the launch contract
        stakingToken.safeTransferFrom(msg.sender, address(this), _totalRewards);

        emit StakingInitialized(_token, _totalRewards, stakingDuration);
    }

    // ═══════════════════════════════════════════════════════════════
    //                        STAKE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Stake tokens to earn rewards
     * @param _amount Amount of tokens to stake
     */
    function stake(uint256 _amount) external onlyInitialized updateReward(msg.sender) {
        require(_amount > 0, "NanoBondStaking: zero amount");

        if (!isStaker[msg.sender]) {
            isStaker[msg.sender] = true;
            totalStakers++;
        }

        totalStaked += _amount;
        stakedBalance[msg.sender] += _amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _amount);
    }

    /**
     * @notice Unstake tokens
     * @param _amount Amount of tokens to unstake
     */
    function unstake(uint256 _amount) external onlyInitialized updateReward(msg.sender) {
        require(_amount > 0, "NanoBondStaking: zero amount");
        require(stakedBalance[msg.sender] >= _amount, "NanoBondStaking: insufficient balance");

        totalStaked -= _amount;
        stakedBalance[msg.sender] -= _amount;

        if (stakedBalance[msg.sender] == 0) {
            isStaker[msg.sender] = false;
            totalStakers--;
        }

        stakingToken.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @notice Claim earned rewards
     */
    function claimReward() external onlyInitialized updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "NanoBondStaking: no reward");

        rewards[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    /**
     * @notice Unstake all and claim rewards
     */
    function exit() external onlyInitialized updateReward(msg.sender) {
        uint256 staked = stakedBalance[msg.sender];
        uint256 reward = rewards[msg.sender];

        if (staked > 0) {
            totalStaked -= staked;
            stakedBalance[msg.sender] = 0;
            isStaker[msg.sender] = false;
            totalStakers--;
            stakingToken.safeTransfer(msg.sender, staked);
            emit Unstaked(msg.sender, staked);
        }

        if (reward > 0) {
            rewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                         VIEWS
    // ═══════════════════════════════════════════════════════════════

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < stakingEnd ? block.timestamp : stakingEnd;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + (
            (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalStaked
        );
    }

    function earned(address _account) public view returns (uint256) {
        return (
            stakedBalance[_account] * (rewardPerToken() - userRewardPerTokenPaid[_account]) / 1e18
        ) + rewards[_account];
    }

    function getAPR() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        // APR in basis points
        return (rewardRate * 365 days * 10000) / totalStaked;
    }

    function getStakingInfo() external view returns (
        address _token,
        uint256 _totalStaked,
        uint256 _totalRewards,
        uint256 _rewardRate,
        uint256 _stakingEnd,
        uint256 _totalStakers,
        bool _initialized
    ) {
        return (
            address(stakingToken),
            totalStaked,
            totalRewards,
            rewardRate,
            stakingEnd,
            totalStakers,
            initialized
        );
    }

    function getUserInfo(address _user) external view returns (
        uint256 _staked,
        uint256 _earned,
        bool _isStaker
    ) {
        return (
            stakedBalance[_user],
            earned(_user),
            isStaker[_user]
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //                         ADMIN
    // ═══════════════════════════════════════════════════════════════

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "NanoBondStaking: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
