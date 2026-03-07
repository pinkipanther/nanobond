// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./NanoBondStaking.sol";

/**
 * @title NanoBondLaunch
 * @notice Individual token launch contract with bonding curve fundraising
 * @dev Handles token creation, fundraising, LP creation on DEX, and staking setup
 */

// Minimal DEX Router interface (SaucerSwap / Uniswap V2 compatible)
interface IDEXRouter {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IDEXFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
}

contract NanoBondToken is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _mintTo
    ) ERC20(_name, _symbol) {
        _mint(_mintTo, _totalSupply);
    }
}

contract NanoBondLaunch {
    // ═══════════════════════════════════════════════════════════════
    //                         ENUMS
    // ═══════════════════════════════════════════════════════════════

    enum LaunchState {
        ACTIVE,      // Accepting contributions
        SUCCEEDED,   // Hard cap reached or duration ended above soft cap
        FINALIZED,   // LP created, staking funded, tokens distributed
        FAILED,      // Soft cap not reached by deadline
        CANCELLED    // Creator cancelled before finalization
    }

    // ═══════════════════════════════════════════════════════════════
    //                         STORAGE
    // ═══════════════════════════════════════════════════════════════

    // Token
    NanoBondToken public token;
    string public name;
    string public symbol;
    uint256 public totalSupply;

    // Raise parameters
    uint256 public hardCap;
    uint256 public softCap;
    uint256 public launchEnd;
    uint256 public launchDuration;
    uint256 public totalRaised;
    LaunchState public state;

    // Distribution (in basis points)
    uint256 public lpPercent;           // % of raised HBAR going to LP
    uint256 public stakingRewardPercent; // % of total supply for staking
    uint256 public platformFeeBps;

    // Addresses
    address public creator;
    address public feeRecipient;
    address public stakingContract;
    address public dexRouter;
    address public lpPair;
    uint256 public lpUnlockTime;
    uint256 public constant LP_LOCK_DURATION = 180 days;

    // Reentrancy guard
    bool private _locked;

    // Contributions
    mapping(address => uint256) public contributions;
    address[] public contributors;
    uint256 public contributorCount;

    // Token allocation
    uint256 public tokensForSale;       // Tokens allocated for contributors
    uint256 public tokensForLP;         // Tokens allocated for LP
    uint256 public tokensForStaking;    // Tokens allocated for staking rewards
    uint256 public tokensForCreator;    // Tokens allocated for creator


    // Claim & Withdraw tracking
    mapping(address => bool) public hasClaimed;
    uint256 public pendingCreatorHbar;

    // ═══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════════

    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event LaunchFinalized(address indexed lpPair, uint256 lpHbar, uint256 lpTokens);
    event TokensClaimed(address indexed claimer, uint256 amount);
    event RefundClaimed(address indexed claimer, uint256 amount);
    event LaunchCancelled();
    event StateChanged(LaunchState oldState, LaunchState newState);
    event LPCreationFailed(string reason);
    event RaisedAmountWithdrawn(address indexed admin, uint256 amount, LaunchState state);

    // ═══════════════════════════════════════════════════════════════
    //                        MODIFIERS
    // ═══════════════════════════════════════════════════════════════

    modifier onlyCreator() {
        require(msg.sender == creator, "NanoBondLaunch: not creator");
        _;
    }

    modifier inState(LaunchState _state) {
        require(state == _state, "NanoBondLaunch: invalid state");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "NanoBondLaunch: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ═══════════════════════════════════════════════════════════════
    //                       CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _launchDuration,
        uint256 _lpPercent,
        uint256 _stakingRewardPercent,
        uint256 _platformFeeBps,
        address _feeRecipient,
        address _stakingContract,
        address _dexRouter,
        address _creator
    ) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        hardCap = _hardCap;
        softCap = _softCap;
        launchDuration = _launchDuration;
        launchEnd = block.timestamp + _launchDuration;
        lpPercent = _lpPercent;
        stakingRewardPercent = _stakingRewardPercent;
        platformFeeBps = _platformFeeBps;
        feeRecipient = _feeRecipient;
        stakingContract = _stakingContract;
        dexRouter = _dexRouter;
        creator = _creator;
        state = LaunchState.ACTIVE;

        // Calculate token allocations
        tokensForStaking = (_totalSupply * _stakingRewardPercent) / 10000;
        tokensForLP = (_totalSupply * _lpPercent) / 10000; // Match HBAR LP percentage
        tokensForCreator = (_totalSupply * 500) / 10000; // 5% for creator
        tokensForSale = _totalSupply - tokensForStaking - tokensForLP - tokensForCreator;

        // Deploy the token - mint all to this contract
        token = new NanoBondToken(_name, _symbol, _totalSupply, address(this));
    }

    // ═══════════════════════════════════════════════════════════════
    //                      CONTRIBUTE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Contribute HBAR to the token launch
     */
    function contribute() external payable inState(LaunchState.ACTIVE) {
        require(block.timestamp < launchEnd, "NanoBondLaunch: launch ended");
        require(msg.value > 0, "NanoBondLaunch: zero contribution");
        require(totalRaised + msg.value <= hardCap, "NanoBondLaunch: exceeds hard cap");

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
            contributorCount++;
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, totalRaised);

        // Auto-finalize if hard cap reached
        if (totalRaised >= hardCap) {
            _changeState(LaunchState.SUCCEEDED);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                      FINALIZE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Check and update launch state after deadline
     */
    function checkState() external {
        if (state != LaunchState.ACTIVE) return;
        if (block.timestamp >= launchEnd) {
            if (totalRaised >= softCap) {
                _changeState(LaunchState.SUCCEEDED);
            } else {
                _changeState(LaunchState.FAILED);
            }
        }
    }

    /**
     * @notice Finalize the launch - create LP, fund staking, distribute tokens
     * @dev Only creator can finalize.
     */
    function finalize() external onlyCreator nonReentrant inState(LaunchState.SUCCEEDED) {
        uint256 actualLPHbar = 0;
        uint256 actualLPTokens = 0;
        uint256 availableHbar = address(this).balance;
        uint256 hbarForLP = (availableHbar * lpPercent) / 10000;
        uint256 platformFee = (availableHbar * platformFeeBps) / 10000;
        uint256 hbarForCreator = availableHbar - hbarForLP - platformFee;

        // Send platform fee
        if (platformFee > 0) {
            (bool feeSent, ) = payable(feeRecipient).call{value: platformFee}("");
            require(feeSent, "NanoBondLaunch: fee transfer failed");
        }

        // Create LP on DEX
        if (hbarForLP > 0 && dexRouter != address(0)) {
            IERC20(address(token)).approve(dexRouter, tokensForLP);

            // 95% slippage protection
            uint256 amountTokenMin = (tokensForLP * 95) / 100;
            uint256 amountETHMin = (hbarForLP * 95) / 100;

            try IDEXRouter(dexRouter).addLiquidityETH{value: hbarForLP}(
                address(token),
                tokensForLP,
                amountTokenMin,
                amountETHMin,
                address(this), // LP tokens stay in contract (time-locked)
                block.timestamp + 300
            ) returns (uint256 amountToken, uint256 amountETH, uint256 /* liquidity */) {
                actualLPHbar = amountETH;
                actualLPTokens = amountToken;

                // Refund unspent HBAR and Tokens to creator
                if (hbarForLP > amountETH) {
                    hbarForCreator += (hbarForLP - amountETH);
                }
                if (tokensForLP > amountToken) {
                    tokensForCreator += (tokensForLP - amountToken);
                }

                // Retrieve LP pair address
                lpPair = IDEXFactory(IDEXRouter(dexRouter).factory()).getPair(
                    address(token),
                    IDEXRouter(dexRouter).WETH()
                );

                // Lock LP tokens for LP_LOCK_DURATION
                lpUnlockTime = block.timestamp + LP_LOCK_DURATION;
            } catch {
                emit LPCreationFailed("DEX addLiquidityETH reverted");
                hbarForCreator += hbarForLP;
                tokensForCreator += tokensForLP;
            }
        } else {
            hbarForCreator += hbarForLP;
            tokensForCreator += tokensForLP;
        }

        // Send remaining HBAR to creator
        if (hbarForCreator > 0) {
            (bool sent, ) = payable(creator).call{value: hbarForCreator}("");
            if (!sent) {
                pendingCreatorHbar += hbarForCreator;
            }
        }

        // Fund staking contract
        if (tokensForStaking > 0 && stakingContract != address(0)) {
            IERC20(address(token)).approve(stakingContract, tokensForStaking);
            NanoBondStaking(stakingContract).initialize(
                address(token),
                tokensForStaking
            );
        }

        // Send creator tokens
        if (tokensForCreator > 0) {
            IERC20(address(token)).transfer(creator, tokensForCreator);
        }

        _changeState(LaunchState.FINALIZED);

        emit LaunchFinalized(lpPair, actualLPHbar, actualLPTokens);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      CLAIM TOKENS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Claim tokens after successful finalization
     */
    function claimTokens() external inState(LaunchState.FINALIZED) {
        require(contributions[msg.sender] > 0, "NanoBondLaunch: no contribution");
        require(!hasClaimed[msg.sender], "NanoBondLaunch: already claimed");

        uint256 userShare = (contributions[msg.sender] * tokensForSale) / totalRaised;
        hasClaimed[msg.sender] = true;

        IERC20(address(token)).transfer(msg.sender, userShare);

        emit TokensClaimed(msg.sender, userShare);
    }

    /**
     * @notice Claim refund if launch failed or was cancelled
     */
    function claimRefund() external {
        require(
            state == LaunchState.FAILED || state == LaunchState.CANCELLED,
            "NanoBondLaunch: not failed or cancelled"
        );
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "NanoBondLaunch: no contribution");

        contributions[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "NanoBondLaunch: refund failed");

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Creator can withdraw all currently raised HBAR before finalization
     * @dev Gives creator full treasury control while launch is ACTIVE or SUCCEEDED
     */
    function withdrawRaisedAmount() external onlyCreator nonReentrant {
        require(
            state == LaunchState.ACTIVE || state == LaunchState.SUCCEEDED,
            "NanoBondLaunch: invalid state"
        );

        uint256 amount = address(this).balance;
        require(amount > 0, "NanoBondLaunch: no raised HBAR");

        (bool sent, ) = payable(creator).call{value: amount}("");
        require(sent, "NanoBondLaunch: withdrawal failed");

        emit RaisedAmountWithdrawn(msg.sender, amount, state);
    }

    /**
     * @notice Allow creator to withdraw pending HBAR if original transfer failed (Pull pattern)
     */
    function withdrawPendingHbar() external onlyCreator {
        uint256 amount = pendingCreatorHbar;
        require(amount > 0, "NanoBondLaunch: no pending HBAR");

        pendingCreatorHbar = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "NanoBondLaunch: withdrawal failed");
    }

    /**
     * @notice Withdraw LP tokens after the lock period expires
     * @dev Creator can retrieve LP tokens once LP_LOCK_DURATION has passed
     */
    function withdrawLP() external onlyCreator {
        require(lpPair != address(0), "NanoBondLaunch: no LP pair");
        require(block.timestamp >= lpUnlockTime, "NanoBondLaunch: LP still locked");

        uint256 lpBalance = IERC20(lpPair).balanceOf(address(this));
        require(lpBalance > 0, "NanoBondLaunch: no LP tokens");

        IERC20(lpPair).transfer(creator, lpBalance);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      CANCEL
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Creator can cancel the launch before finalization
     */
    function cancel() external onlyCreator inState(LaunchState.ACTIVE) {
        _changeState(LaunchState.CANCELLED);
        emit LaunchCancelled();
    }

    // ═══════════════════════════════════════════════════════════════
    //                        VIEWS
    // ═══════════════════════════════════════════════════════════════

    function getContribution(address _contributor) external view returns (uint256) {
        return contributions[_contributor];
    }

    function getProgress() external view returns (uint256) {
        if (hardCap == 0) return 0;
        return (totalRaised * 10000) / hardCap;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= launchEnd) return 0;
        return launchEnd - block.timestamp;
    }

    function getTokenPrice() external view returns (uint256) {
        if (tokensForSale == 0) return 0;
        return (totalRaised > 0 ? (totalRaised * 1e18) / tokensForSale : (hardCap * 1e18) / tokensForSale);
    }

    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    function getLaunchInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _totalRaised,
        uint256 _launchEnd,
        LaunchState _state,
        uint256 _contributorCount,
        address _tokenAddress
    ) {
        return (
            name,
            symbol,
            totalSupply,
            hardCap,
            softCap,
            totalRaised,
            launchEnd,
            state,
            contributorCount,
            address(token)
        );
    }


    function _changeState(LaunchState _newState) internal {
        LaunchState old = state;
        state = _newState;
        emit StateChanged(old, _newState);
    }

    receive() external payable {}
}
