// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/**
 * @title BondToken
 * @notice Simple ERC-20 token with controlled minting for NanoBond yield distribution.
 * @dev Only the bond contract (minter) can mint new tokens for yield.
 */
contract BondToken is ERC20 {
    uint256 private constant REWARD_SCALE = 1e18;

    address public immutable minter;
    uint256 public accRewardsPerShare;
    uint256 public totalRewardsDistributed;

    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;

    event RewardsDistributed(uint256 amount, uint256 eligibleSupply);
    event RewardsClaimed(address indexed account, uint256 amount);

    constructor(string memory _name, string memory _symbol, address _minter, uint256 _initialSupply)
        ERC20(_name, _symbol)
    {
        minter = _minter;
        _mint(_minter, _initialSupply);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "BondToken: not minter");
        _mint(to, amount);
    }

    function distributeRewards(uint256 amount) external {
        require(msg.sender == minter, "BondToken: not minter");
        require(amount > 0, "BondToken: zero rewards");

        uint256 eligible = eligibleSupply();
        require(eligible > 0, "BondToken: no eligible holders");

        totalRewardsDistributed += amount;
        accRewardsPerShare += (amount * REWARD_SCALE) / eligible;
        _mint(address(this), amount);

        emit RewardsDistributed(amount, eligible);
    }

    function claimRewards() external returns (uint256) {
        return _claimRewards(msg.sender);
    }

    function claimRewardsFor(address account) external returns (uint256) {
        return _claimRewards(account);
    }

    function pendingReward(address account) external view returns (uint256) {
        if (_isExcluded(account)) return 0;
        return pendingRewards[account] + _accrued(account);
    }

    function eligibleSupply() public view returns (uint256) {
        return totalSupply() - balanceOf(address(this)) - balanceOf(minter);
    }

    function _claimRewards(address account) internal returns (uint256) {
        _settle(account);
        uint256 reward = pendingRewards[account];
        require(reward > 0, "BondToken: no rewards");

        pendingRewards[account] = 0;
        _transfer(address(this), account, reward);

        emit RewardsClaimed(account, reward);
        return reward;
    }

    function _update(address from, address to, uint256 value) internal override {
        _settle(from);
        _settle(to);
        super._update(from, to, value);
        _syncDebt(from);
        _syncDebt(to);
    }

    function _settle(address account) internal {
        if (_isExcluded(account)) return;
        uint256 reward = _accrued(account);
        if (reward > 0) {
            pendingRewards[account] += reward;
        }
        rewardDebt[account] = (balanceOf(account) * accRewardsPerShare) / REWARD_SCALE;
    }

    function _syncDebt(address account) internal {
        if (_isExcluded(account)) return;
        rewardDebt[account] = (balanceOf(account) * accRewardsPerShare) / REWARD_SCALE;
    }

    function _accrued(address account) internal view returns (uint256) {
        uint256 accumulated = (balanceOf(account) * accRewardsPerShare) / REWARD_SCALE;
        if (accumulated <= rewardDebt[account]) return 0;
        return accumulated - rewardDebt[account];
    }

    function _isExcluded(address account) internal view returns (bool) {
        return account == address(0) || account == address(this) || account == minter;
    }
}
