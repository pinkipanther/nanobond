// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./BondToken.sol";

/**
 * @title NanoBond
 * @notice A bond contract that raises HBAR and distributes APR rewards
 *         to ERC-20 bond token holders every epoch.
 *
 * Flow:
 *   1. RAISING  — Users contribute HBAR. Creator sets yield rate, description, etc.
 *   2. ACTIVE   — Raise succeeded. Contributors claim transferable bonds.
 *                  Creator withdraws HBAR. Yield distributed every epoch.
 *   3. MATURED  — (optional) Bond has matured, no more yield.
 *   4. FAILED   — Soft cap not met after deadline. Refunds available.
 *   5. CANCELLED — Creator cancelled during raise. Refunds available.
 */
contract NanoBond {
    // ════════════════════════════════════════════════
    //                    ENUMS
    // ════════════════════════════════════════════════

    enum BondState {
        RAISING,
        ACTIVE,
        MATURED,
        FAILED,
        CANCELLED
    }

    // ════════════════════════════════════════════════
    //                BOND METADATA
    // ════════════════════════════════════════════════

    string public name;
    string public symbol;
    string public description;
    address public token; // BondToken ERC-20

    // ════════════════════════════════════════════════
    //               RAISE PARAMETERS
    // ════════════════════════════════════════════════

    uint256 public totalSupply; // Total token supply
    uint256 public hardCap; // Max HBAR to raise (in tinybars)
    uint256 public softCap; // Min HBAR to raise (in tinybars)
    uint256 public raiseEnd; // Timestamp when raise ends
    uint256 public raiseDuration; // Duration of raise in seconds
    uint256 public totalRaised; // HBAR raised so far

    // ════════════════════════════════════════════════
    //              YIELD PARAMETERS
    // ════════════════════════════════════════════════

    uint256 public yieldRateBps; // Annual yield in basis points (500 = 5%)
    uint256 public epochDuration; // Seconds between yield distributions
    uint256 public lastYieldTime; // Last time yield was distributed
    uint256 public totalYieldMinted; // Total yield tokens minted to date

    // ════════════════════════════════════════════════
    //             LEGACY STAKING STORAGE
    // ════════════════════════════════════════════════

    uint256 public totalStaked;
    uint256 public accRewardsPerShare; // Deprecated: rewards now accrue inside BondToken.

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;

    // ════════════════════════════════════════════════
    //               RAISE TRACKING
    // ════════════════════════════════════════════════

    mapping(address => uint256) public contributions;
    mapping(address => bool) public hasClaimed;
    address[] internal _contributors;
    uint256 public contributorCount;

    // ════════════════════════════════════════════════
    //              TOKEN ALLOCATIONS
    // ════════════════════════════════════════════════

    uint256 public tokensForBonders; // 95% — distributed to contributors
    uint256 public tokensForCreator; // 5%  — sent to creator on activation

    // ════════════════════════════════════════════════
    //                   STATE
    // ════════════════════════════════════════════════

    BondState public state;
    address public creator;
    address public feeRecipient;
    uint256 public platformFeeBps;
    uint256 public hbarWithdrawn; // HBAR withdrawn by creator
    uint256 public platformFeePaid;
    bool public creatorTokensReleased;

    // ════════════════════════════════════════════════
    //                  REENTRANCY
    // ════════════════════════════════════════════════

    bool private _locked;

    // ════════════════════════════════════════════════
    //                   EVENTS
    // ════════════════════════════════════════════════

    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event BondsClaimed(address indexed claimer, uint256 amount);
    event BondActivated(uint256 totalRaised, uint256 contributors);
    event YieldDistributed(uint256 amount, uint256 timestamp);
    event YieldClaimed(address indexed claimer, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event HbarWithdrawn(address indexed creator, uint256 amount);
    event StateChanged(BondState oldState, BondState newState);
    event RefundClaimed(address indexed claimer, uint256 amount);
    event BondCancelled();

    // ════════════════════════════════════════════════
    //                  MODIFIERS
    // ════════════════════════════════════════════════

    modifier onlyCreator() {
        require(msg.sender == creator, "NanoBond: not creator");
        _;
    }

    modifier inState(BondState _state) {
        require(state == _state, "NanoBond: invalid state");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "NanoBond: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ════════════════════════════════════════════════
    //                 CONSTRUCTOR
    // ════════════════════════════════════════════════

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _description,
        uint256 _totalSupply,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _raiseDuration,
        uint256 _yieldRateBps,
        uint256 _epochDuration,
        uint256 _platformFeeBps,
        address _feeRecipient,
        address _creator
    ) {
        name = _name;
        symbol = _symbol;
        description = _description;
        totalSupply = _totalSupply;
        hardCap = _hardCap;
        softCap = _softCap;
        raiseDuration = _raiseDuration;
        raiseEnd = block.timestamp + _raiseDuration;
        yieldRateBps = _yieldRateBps;
        epochDuration = _epochDuration;
        platformFeeBps = _platformFeeBps;
        feeRecipient = _feeRecipient;
        creator = _creator;

        // Deploy ERC-20 bond token — minted entirely to this contract
        BondToken bondToken = new BondToken(_name, _symbol, address(this), _totalSupply);
        token = address(bondToken);

        // Allocations: 95% to bonders, 5% to creator
        tokensForCreator = (_totalSupply * 500) / 10000;
        tokensForBonders = _totalSupply - tokensForCreator;

        state = BondState.RAISING;
    }

    // ════════════════════════════════════════════════
    //               RAISE PHASE
    // ════════════════════════════════════════════════

    /**
     * @notice Contribute HBAR to purchase bonds.
     */
    function contribute() external payable inState(BondState.RAISING) {
        require(block.timestamp < raiseEnd, "NanoBond: raise ended");
        require(msg.value > 0, "NanoBond: zero contribution");
        require(totalRaised + msg.value <= hardCap, "NanoBond: exceeds hard cap");

        if (contributions[msg.sender] == 0) {
            _contributors.push(msg.sender);
            contributorCount++;
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, totalRaised);

        if (totalRaised >= hardCap) {
            _activateBond();
        }
    }

    /**
     * @notice Check if raise period has ended and update state accordingly.
     */
    function checkState() external {
        if (state != BondState.RAISING) return;
        if (block.timestamp < raiseEnd) return;

        if (totalRaised >= softCap) {
            _activateBond();
        } else {
            _changeState(BondState.FAILED);
        }
    }

    /**
     * @notice Activate the bond (creator can call after soft cap is met + deadline passed).
     */
    function activate() external onlyCreator inState(BondState.RAISING) {
        require(totalRaised >= softCap, "NanoBond: soft cap not met");
        _activateBond();
    }

    // ════════════════════════════════════════════════
    //              CLAIM BONDS (AUTO-STAKE)
    // ════════════════════════════════════════════════

    /**
     * @notice Claim transferable bond tokens after raise succeeds.
     */
    function claimBonds() external inState(BondState.ACTIVE) nonReentrant {
        require(contributions[msg.sender] > 0, "NanoBond: no contribution");
        require(!hasClaimed[msg.sender], "NanoBond: already claimed");

        hasClaimed[msg.sender] = true;

        uint256 userShare = (contributions[msg.sender] * tokensForBonders) / totalRaised;
        require(userShare > 0, "NanoBond: zero share");

        require(IERC20(token).transfer(msg.sender, userShare), "NanoBond: token transfer failed");

        emit BondsClaimed(msg.sender, userShare);
    }

    // ════════════════════════════════════════════════
    //              YIELD DISTRIBUTION
    // ════════════════════════════════════════════════

    /**
     * @notice Distribute yield for completed epochs.
     * @dev Anyone can call this. Yield is minted proportionally to token holders.
     */
    function distributeYield() external {
        require(state == BondState.ACTIVE, "NanoBond: not active");
        uint256 eligibleSupply = BondToken(token).eligibleSupply();
        require(eligibleSupply > 0, "NanoBond: no token holders");

        uint256 elapsed = block.timestamp - lastYieldTime;
        require(elapsed >= epochDuration, "NanoBond: epoch not complete");

        // Calculate how many full epochs have passed
        uint256 epochs = elapsed / epochDuration;
        uint256 effectiveElapsed = epochs * epochDuration;

        // Yield = eligible token supply × yieldRateBps × effectiveElapsed / (365 days × 10000)
        uint256 yieldAmount = (eligibleSupply * yieldRateBps * effectiveElapsed) / (365 days * 10000);

        if (yieldAmount > 0) {
            BondToken(token).distributeRewards(yieldAmount);
            totalYieldMinted += yieldAmount;
        }

        lastYieldTime += effectiveElapsed;

        emit YieldDistributed(yieldAmount, block.timestamp);
    }

    // ════════════════════════════════════════════════
    //                  STAKING
    // ════════════════════════════════════════════════

    /**
     * @notice Deprecated. Bond token holders earn yield without staking.
     */
    function stake(uint256 amount) external view inState(BondState.ACTIVE) {
        amount;
        revert("NanoBond: staking deprecated");
    }

    /**
     * @notice Deprecated. Bond token holders earn yield without staking.
     */
    function unstake(uint256 amount) external pure {
        amount;
        revert("NanoBond: staking deprecated");
    }

    /**
     * @notice Claim accumulated yield rewards.
     */
    function claimYield() external nonReentrant {
        uint256 reward = BondToken(token).claimRewardsFor(msg.sender);

        emit YieldClaimed(msg.sender, reward);
    }

    /**
     * @notice View pending yield for a user.
     */
    function pendingYield(address user) external view returns (uint256) {
        uint256 pending = BondToken(token).pendingReward(user);
        uint256 balance = IERC20(token).balanceOf(user);

        if (state == BondState.ACTIVE && balance > 0) {
            uint256 eligibleSupply = BondToken(token).eligibleSupply();
            uint256 elapsed = block.timestamp - lastYieldTime;
            if (eligibleSupply > 0 && elapsed >= epochDuration) {
                uint256 epochs = elapsed / epochDuration;
                uint256 effectiveElapsed = epochs * epochDuration;
                uint256 yieldAmount = (eligibleSupply * yieldRateBps * effectiveElapsed) / (365 days * 10000);
                pending += (yieldAmount * balance) / eligibleSupply;
            }
        }

        return pending;
    }

    // ════════════════════════════════════════════════
    //              ADMIN FUNCTIONS
    // ════════════════════════════════════════════════

    /**
     * @notice Creator withdraws raised HBAR for project funding.
     */
    function withdrawHbar(uint256 amount) external onlyCreator inState(BondState.ACTIVE) nonReentrant {
        uint256 withdrawable = totalRaised - platformFeePaid - hbarWithdrawn;
        require(amount <= withdrawable, "NanoBond: exceeds withdrawable");
        require(amount > 0, "NanoBond: zero amount");

        hbarWithdrawn += amount;

        (bool sent,) = payable(creator).call{value: amount}("");
        require(sent, "NanoBond: transfer failed");

        emit HbarWithdrawn(creator, amount);
    }

    /**
     * @notice View how much HBAR the creator can still withdraw.
     */
    function withdrawableHbar() external view returns (uint256) {
        if (state != BondState.ACTIVE) return 0;
        uint256 available = totalRaised - platformFeePaid - hbarWithdrawn;
        // Cap at actual contract balance
        uint256 balance = address(this).balance;
        return available < balance ? available : balance;
    }

    // ════════════════════════════════════════════════
    //           CANCEL / REFUND / FAILED
    // ════════════════════════════════════════════════

    /**
     * @notice Creator cancels the bond during raise phase.
     */
    function cancel() external onlyCreator inState(BondState.RAISING) {
        _changeState(BondState.CANCELLED);
        emit BondCancelled();
    }

    /**
     * @notice Claim HBAR refund if bond failed or was cancelled.
     */
    function claimRefund() external nonReentrant {
        require(state == BondState.FAILED || state == BondState.CANCELLED, "NanoBond: not refundable");
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "NanoBond: no contribution");

        contributions[msg.sender] = 0;

        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "NanoBond: refund failed");

        emit RefundClaimed(msg.sender, amount);
    }

    // ════════════════════════════════════════════════
    //               VIEW FUNCTIONS
    // ════════════════════════════════════════════════

    function getContributors() external view returns (address[] memory) {
        return _contributors;
    }

    function getProgress() external view returns (uint256) {
        if (hardCap == 0) return 0;
        return (totalRaised * 10000) / hardCap;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= raiseEnd) return 0;
        return raiseEnd - block.timestamp;
    }

    function getNextEpoch() external view returns (uint256) {
        if (state != BondState.ACTIVE) return 0;
        uint256 nextEpoch = lastYieldTime + epochDuration;
        if (block.timestamp >= nextEpoch) return 0; // Ready now
        return nextEpoch - block.timestamp;
    }

    function getBondInfo()
        external
        view
        returns (
            string memory _name,
            string memory _symbol,
            string memory _description,
            uint256 _totalSupply,
            uint256 _hardCap,
            uint256 _softCap,
            uint256 _totalRaised,
            uint256 _raiseEnd,
            BondState _state,
            uint256 _contributorCount,
            address _tokenAddress,
            uint256 _yieldRateBps,
            uint256 _epochDuration,
            uint256 _totalStaked,
            uint256 _totalYieldMinted
        )
    {
        return (
            name,
            symbol,
            description,
            totalSupply,
            hardCap,
            softCap,
            totalRaised,
            raiseEnd,
            state,
            contributorCount,
            token,
            yieldRateBps,
            epochDuration,
            totalStaked,
            totalYieldMinted
        );
    }

    // ════════════════════════════════════════════════
    //              INTERNAL HELPERS
    // ════════════════════════════════════════════════

    function _changeState(BondState newState) internal {
        BondState oldState = state;
        state = newState;
        emit StateChanged(oldState, newState);
    }

    function _activateBond() internal {
        require(state == BondState.RAISING, "NanoBond: invalid state");

        _changeState(BondState.ACTIVE);
        lastYieldTime = block.timestamp;

        uint256 platformFee = (totalRaised * platformFeeBps) / 10000;
        platformFeePaid = platformFee;

        if (platformFee > 0 && feeRecipient != address(0)) {
            (bool sent,) = payable(feeRecipient).call{value: platformFee}("");
            require(sent, "NanoBond: fee transfer failed");
        }

        require(IERC20(token).transfer(creator, tokensForCreator), "NanoBond: token transfer failed");
        creatorTokensReleased = true;

        emit BondActivated(totalRaised, contributorCount);
    }

    receive() external payable {}
}
