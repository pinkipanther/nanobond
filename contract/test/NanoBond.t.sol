// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {NanoBondFactory} from "../src/NanoBondFactory.sol";
import {NanoBondLaunch} from "../src/NanoBondLaunch.sol";
import {NanoBondStaking} from "../src/NanoBondStaking.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// ════════════════════════════════════════════════
//               TEST HELPERS
// ════════════════════════════════════════════════

/// @dev MockDEXRouter also acts as its own factory to avoid getPair revert on address(0)
contract MockDEXRouter {
    bool public shouldFail;
    address public mockPair;

    constructor() {
        // Use a non-zero deterministic address for the mock pair
        mockPair = address(uint160(uint256(keccak256("mock_pair"))));
    }

    function setShouldFail(bool _fail) external {
        shouldFail = _fail;
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        if (shouldFail) revert("DEX: addLiquidity failed");
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        return (amountTokenDesired, msg.value, 1e18);
    }

    // Router returns itself as factory
    function factory() external view returns (address) {
        return address(this);
    }

    function WETH() external view returns (address) {
        return mockPair; // non-zero so getPair works
    }

    // Factory interface: getPair
    function getPair(address, address) external view returns (address) {
        return mockPair;
    }
}

// ════════════════════════════════════════════════
//            FACTORY TESTS
// ════════════════════════════════════════════════

contract NanoBondFactoryTest is Test {
    NanoBondFactory public factory;
    MockDEXRouter public dexRouter;

    address public owner = address(this);
    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // Default launch params
    string constant NAME = "Test Token";
    string constant SYMBOL = "TEST";
    uint256 constant TOTAL_SUPPLY = 1_000_000_000e18; // 1B tokens
    uint256 constant HARD_CAP = 100_000e18;           // 100k HBAR
    uint256 constant SOFT_CAP = 25_000e18;            // 25k HBAR
    uint256 constant LAUNCH_DURATION = 7 days;
    uint256 constant LP_PERCENT = 5000;               // 50% to LP
    uint256 constant STAKING_REWARD_PERCENT = 1500;   // 15% for staking
    uint256 constant STAKING_DURATION = 90 days;

    function setUp() public {
        dexRouter = new MockDEXRouter();
        factory = new NanoBondFactory(feeRecipient);
        factory.setDexRouter(address(dexRouter));
        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
        vm.deal(bob, 1_000_000e18);
    }

    // ── Constructor ──────────────────────────────
    function test_Constructor() public view {
        assertEq(factory.owner(), address(this));
        assertEq(factory.feeRecipient(), feeRecipient);
        assertEq(factory.platformFeeBps(), 250);
        assertEq(factory.launchCount(), 0);
    }

    // ── createLaunch ─────────────────────────────
    function test_CreateLaunch_Success() public {
        vm.prank(creator);
        (uint256 launchId, address launchAddr, address stakingAddr) = factory.createLaunch(
            NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT,
            STAKING_DURATION
        );

        assertEq(launchId, 0);
        assertTrue(launchAddr != address(0));
        assertTrue(stakingAddr != address(0));
        assertEq(factory.launchCount(), 1);
        assertEq(factory.allLaunches(0), launchAddr);

        NanoBondFactory.LaunchInfo memory info = factory.getLaunch(0);
        assertEq(info.creator, creator);
        assertEq(info.name, NAME);
        assertEq(info.symbol, SYMBOL);
        assertTrue(info.active);
    }

    function test_CreateLaunch_GameType() public {
        // Test removed
    }

    function test_CreateLaunch_MultipleByCreator() public {
        vm.startPrank(creator);
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
        factory.createLaunch("Token2", "TK2", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
        vm.stopPrank();

        uint256[] memory cLaunches = factory.getCreatorLaunches(creator);
        assertEq(cLaunches.length, 2);
        assertEq(factory.launchCount(), 2);
        assertEq(factory.getAllLaunches().length, 2);
    }

    function test_CreateLaunch_RevertZeroHardCap() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: hardCap must be > 0");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, 0, SOFT_CAP, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertZeroSoftCap() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: invalid softCap");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, 0, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertSoftCapExceedsHardCap() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: invalid softCap");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, HARD_CAP + 1, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertZeroTotalSupply() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: totalSupply must be > 0");
        factory.createLaunch(NAME, SYMBOL, 0, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertLPPercentTooHigh() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: lpPercent too high");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, 8001, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertStakingTooHigh() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: staking reward too high");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, LP_PERCENT, 3001, STAKING_DURATION);
    }

    // ── Admin ─────────────────────────────────
    function test_SetFeeRecipient() public {
        address newRecipient = makeAddr("newRecipient");
        factory.setFeeRecipient(newRecipient);
        assertEq(factory.feeRecipient(), newRecipient);
    }

    function test_SetPlatformFee() public {
        factory.setPlatformFee(500);
        assertEq(factory.platformFeeBps(), 500);
    }

    function test_SetPlatformFee_RevertTooHigh() public {
        vm.expectRevert("NanoBondFactory: fee too high");
        factory.setPlatformFee(1001);
    }

    function test_TransferOwnership() public {
        factory.transferOwnership(alice);
        assertEq(factory.owner(), alice);
    }

    function test_TransferOwnership_RevertZeroAddress() public {
        vm.expectRevert("NanoBondFactory: zero address");
        factory.transferOwnership(address(0));
    }

    function test_Admin_RevertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondFactory: not owner");
        factory.setFeeRecipient(alice);
    }

    function test_CreateLaunch_RevertLPPercentTooLow() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: lpPercent too low");
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, 999, STAKING_REWARD_PERCENT, STAKING_DURATION);
    }

    function test_CreateLaunch_RevertTotalAllocationOverflow() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: total allocation exceeds 100%");
        // 8000 + 2000 + 500 = 10500 > 10000
        factory.createLaunch(NAME, SYMBOL, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, LAUNCH_DURATION, 8000, 2000, STAKING_DURATION);
    }
}

// ════════════════════════════════════════════════
//            LAUNCH TESTS
// ════════════════════════════════════════════════

contract NanoBondLaunchTest is Test {
    NanoBondFactory public factory;
    NanoBondLaunch public launch;
    NanoBondStaking public staking;
    MockDEXRouter public dexRouter;
    IERC20 public token;

    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 constant HARD_CAP = 100_000e18;
    uint256 constant SOFT_CAP = 25_000e18;
    uint256 constant LAUNCH_DURATION = 7 days;
    uint256 constant LP_PERCENT = 5000;
    uint256 constant STAKING_REWARD_PERCENT = 1500;

    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event LaunchFinalized(address indexed lpPair, uint256 lpHbar, uint256 lpTokens);
    event TokensClaimed(address indexed claimer, uint256 amount);
    event RefundClaimed(address indexed claimer, uint256 amount);
    event LaunchCancelled();

    function setUp() public {
        dexRouter = new MockDEXRouter();
        factory = new NanoBondFactory(feeRecipient);
        factory.setDexRouter(address(dexRouter));

        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
        vm.deal(bob, 1_000_000e18);
        vm.deal(charlie, 1_000_000e18);

        vm.prank(creator);
        (, address launchAddr, address stakingAddr) = factory.createLaunch(
            "Test Token", "TEST", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT,
            90 days
        );

        launch = NanoBondLaunch(payable(launchAddr));
        staking = NanoBondStaking(stakingAddr);
        token = IERC20(address(launch.token()));
    }

    // ── Token Allocations ─────────────────────────
    function test_TokenAllocations() public view {
        uint256 stakingTokens = (TOTAL_SUPPLY * STAKING_REWARD_PERCENT) / 10000;
        uint256 lpTokens = (TOTAL_SUPPLY * LP_PERCENT) / 10000;
        uint256 creatorTokens = (TOTAL_SUPPLY * 500) / 10000;
        uint256 saleTokens = TOTAL_SUPPLY - stakingTokens - lpTokens - creatorTokens;

        assertEq(launch.tokensForStaking(), stakingTokens);
        assertEq(launch.tokensForLP(), lpTokens);
        assertEq(launch.tokensForCreator(), creatorTokens);
        assertEq(launch.tokensForSale(), saleTokens);
        assertEq(token.balanceOf(address(launch)), TOTAL_SUPPLY);
    }

    // ── Contribute ────────────────────────────────
    function test_Contribute_Success() public {
        uint256 amount = 10_000e18;
        vm.expectEmit(true, false, false, true, address(launch));
        emit Contributed(alice, amount, amount);

        vm.prank(alice);
        launch.contribute{value: amount}();

        assertEq(launch.contributions(alice), amount);
        assertEq(launch.totalRaised(), amount);
        assertEq(launch.contributorCount(), 1);
    }

    function test_Contribute_MultipleContributors() public {
        vm.prank(alice);
        launch.contribute{value: 10_000e18}();

        vm.prank(bob);
        launch.contribute{value: 5_000e18}();

        assertEq(launch.totalRaised(), 15_000e18);
        assertEq(launch.contributorCount(), 2);
    }

    function test_Contribute_SameContributorMultipleTimes() public {
        vm.prank(alice);
        launch.contribute{value: 10_000e18}();
        vm.prank(alice);
        launch.contribute{value: 5_000e18}();

        assertEq(launch.contributions(alice), 15_000e18);
        assertEq(launch.contributorCount(), 1); // Still 1 unique contributor
    }

    function test_Contribute_AutoSucceedsAtHardCap() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();

        assertEq(uint256(launch.state()), 1); // SUCCEEDED
    }

    function test_Contribute_RevertAfterDeadline() public {
        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: launch ended");
        launch.contribute{value: 1e18}();
    }

    function test_Contribute_RevertZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: zero contribution");
        launch.contribute{value: 0}();
    }

    function test_Contribute_RevertExceedsHardCap() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: exceeds hard cap");
        launch.contribute{value: HARD_CAP + 1}();
    }

    function test_Contribute_RevertWhenNotActive() public {
        // Cancel the launch
        vm.prank(creator);
        launch.cancel();

        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: invalid state");
        launch.contribute{value: 1e18}();
    }

    // ── checkState ────────────────────────────────
    function test_CheckState_Succeeds_AboveSoftCap() public {
        vm.prank(alice);
        launch.contribute{value: SOFT_CAP}();

        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        launch.checkState();

        assertEq(uint256(launch.state()), 1); // SUCCEEDED
    }

    function test_CheckState_Fails_BelowSoftCap() public {
        vm.prank(alice);
        launch.contribute{value: SOFT_CAP - 1}();

        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        launch.checkState();

        assertEq(uint256(launch.state()), 3); // FAILED
    }

    function test_CheckState_NoOp_BeforeDeadline() public {
        vm.prank(alice);
        launch.contribute{value: SOFT_CAP}();

        launch.checkState();
        assertEq(uint256(launch.state()), 0); // Still ACTIVE
    }

    function test_CheckState_NoOp_WhenNotActive() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}(); // Auto-succeeds

        launch.checkState(); // Should not revert even after SUCCEEDED
        assertEq(uint256(launch.state()), 1); // SUCCEEDED
    }

    // ── Finalize (with DEX) ───────────────────────
    function test_Finalize_Success_WithDEX() public {
        // Fill to hard cap → auto SUCCEEDED
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();
        assertEq(uint256(launch.state()), 1);

        uint256 feeRecipientBefore = feeRecipient.balance;

        vm.prank(creator);
        launch.finalize();

        assertEq(uint256(launch.state()), 2); // FINALIZED

        // Fee collected (2.5% of HARD_CAP)
        uint256 expectedFee = (HARD_CAP * 250) / 10000;
        assertEq(feeRecipient.balance - feeRecipientBefore, expectedFee);

        // Staking should be initialized
        assertTrue(staking.initialized());
        assertEq(staking.totalRewards(), launch.tokensForStaking());

        // LP pair should be the mock pair address
        assertEq(launch.lpPair(), dexRouter.mockPair());
    }

    function test_Finalize_Success_NoDEX() public {
        // Create a launch without DEX
        factory.setDexRouter(address(0));
        vm.prank(creator);
        (, address launchAddr2, ) = factory.createLaunch(
            "Token2", "TK2", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT,
            90 days
        );
        factory.setDexRouter(address(dexRouter));

        NanoBondLaunch launch2 = NanoBondLaunch(payable(launchAddr2));

        vm.prank(alice);
        launch2.contribute{value: HARD_CAP}();

        uint256 creatorBalanceBefore = creator.balance;
        vm.prank(creator);
        launch2.finalize();

        assertEq(uint256(launch2.state()), 2);
        // Creator gets HBAR for LP since no DEX
        assertTrue(creator.balance > creatorBalanceBefore);
    }

    function test_Finalize_DEXFails_FallbackToCreator() public {
        dexRouter.setShouldFail(true);

        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();

        uint256 creatorBalanceBefore = creator.balance;
        vm.prank(creator);
        launch.finalize();

        assertEq(uint256(launch.state()), 2);
        // Creator should receive the LP HBAR as fallback
        assertTrue(creator.balance > creatorBalanceBefore);
    }

    function test_Finalize_RevertWhenNotSucceeded() public {
        vm.prank(alice);
        launch.contribute{value: SOFT_CAP}();

        vm.prank(creator);
        vm.expectRevert("NanoBondLaunch: invalid state");
        launch.finalize();
    }

    function test_Finalize_RevertNotCreator() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();

        vm.prank(bob);
        vm.expectRevert("NanoBondLaunch: not creator");
        launch.finalize();
    }

    function test_WithdrawRaisedAmount_Success() public {
        vm.prank(alice);
        launch.contribute{value: 12_345e18}();

        uint256 creatorBefore = creator.balance;
        vm.prank(creator);
        launch.withdrawRaisedAmount();

        assertEq(creator.balance - creatorBefore, 12_345e18);
        assertEq(address(launch).balance, 0);
    }

    function test_WithdrawRaisedAmount_RevertNotCreator() public {
        vm.prank(alice);
        launch.contribute{value: 1e18}();

        vm.prank(bob);
        vm.expectRevert("NanoBondLaunch: not creator");
        launch.withdrawRaisedAmount();
    }

    function test_WithdrawRaisedAmount_RevertNoRaisedHbar() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondLaunch: no raised HBAR");
        launch.withdrawRaisedAmount();
    }

    function test_WithdrawRaisedAmount_RevertAfterFinalized() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();

        vm.prank(creator);
        launch.finalize();

        vm.prank(creator);
        vm.expectRevert("NanoBondLaunch: invalid state");
        launch.withdrawRaisedAmount();
    }

    // ── Claim Tokens ──────────────────────────────
    // Helper: create a launch WITHOUT a DEX router so finalize is simpler
    function _createAndFinalizeNoDEX(
        uint256 aliceContrib,
        uint256 bobContrib
    ) internal returns (NanoBondLaunch l, IERC20 t) {
        factory.setDexRouter(address(0));
        vm.prank(creator);
        (, address la, ) = factory.createLaunch(
            "Claim Test", "CLM", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            LAUNCH_DURATION, LP_PERCENT, STAKING_REWARD_PERCENT,
            90 days
        );
        factory.setDexRouter(address(dexRouter));
        l = NanoBondLaunch(payable(la));
        t = IERC20(address(l.token()));

        if (aliceContrib > 0) {
            vm.prank(alice);
            l.contribute{value: aliceContrib}();
        }
        if (bobContrib > 0) {
            vm.prank(bob);
            l.contribute{value: bobContrib}();
        }
        vm.prank(creator);
        l.finalize();
    }

    function test_ClaimTokens_Success() public {
        uint256 aliceContrib = 30_000e18;
        uint256 bobContrib = 70_000e18;

        (NanoBondLaunch l, IERC20 t) = _createAndFinalizeNoDEX(aliceContrib, bobContrib);

        assertEq(uint256(l.state()), 2); // FINALIZED

        uint256 tokensForSale = l.tokensForSale();
        uint256 totalRaised = l.totalRaised();

        // Alice claims
        vm.prank(alice);
        l.claimTokens();
        uint256 aliceExpected = (aliceContrib * tokensForSale) / totalRaised;
        assertEq(t.balanceOf(alice), aliceExpected);
        assertTrue(l.hasClaimed(alice));

        // Bob claims
        vm.prank(bob);
        l.claimTokens();
        uint256 bobExpected = (bobContrib * tokensForSale) / totalRaised;
        assertEq(t.balanceOf(bob), bobExpected);
    }

    function test_ClaimTokens_RevertAlreadyClaimed() public {
        (NanoBondLaunch l, ) = _createAndFinalizeNoDEX(HARD_CAP, 0);

        vm.prank(alice);
        l.claimTokens();

        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: already claimed");
        l.claimTokens();
    }

    function test_ClaimTokens_RevertNoContribution() public {
        (NanoBondLaunch l, ) = _createAndFinalizeNoDEX(HARD_CAP, 0);

        vm.prank(bob);
        vm.expectRevert("NanoBondLaunch: no contribution");
        l.claimTokens();
    }

    function test_ClaimTokens_RevertNotFinalized() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();
        // SUCCEEDED but not FINALIZED

        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: invalid state");
        launch.claimTokens();
    }

    // ── Refund ────────────────────────────────────
    function test_ClaimRefund_Success() public {
        uint256 contribution = 10_000e18;
        vm.prank(alice);
        launch.contribute{value: contribution}();

        // Let launch fail (no one else contributed, soft cap not met)
        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        launch.checkState();
        assertEq(uint256(launch.state()), 3); // FAILED

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        launch.claimRefund();

        assertEq(alice.balance - balanceBefore, contribution);
        assertEq(launch.contributions(alice), 0);
    }

    function test_ClaimRefund_RevertNoContribution() public {
        // Make launch fail
        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        launch.checkState();

        vm.prank(bob);
        vm.expectRevert("NanoBondLaunch: no contribution");
        launch.claimRefund();
    }

    // ── Cancel ────────────────────────────────────
    function test_Cancel_Success() public {
        vm.prank(creator);
        vm.expectEmit(false, false, false, false, address(launch));
        emit LaunchCancelled();
        launch.cancel();

        assertEq(uint256(launch.state()), 4); // CANCELLED
    }

    function test_Cancel_AllowsRefunds() public {
        vm.prank(alice);
        launch.contribute{value: 10_000e18}();

        vm.prank(creator);
        launch.cancel();

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        launch.claimRefund();

        assertEq(alice.balance - balanceBefore, 10_000e18);
    }

    function test_Cancel_RevertNotCreator() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondLaunch: not creator");
        launch.cancel();
    }

    // ── View Functions ────────────────────────────
    function test_GetProgress() public {
        vm.prank(alice);
        launch.contribute{value: HARD_CAP / 2}();

        uint256 progress = launch.getProgress();
        assertEq(progress, 5000); // 50% in bps
    }

    function test_GetTimeRemaining() public {
        uint256 remaining = launch.getTimeRemaining();
        assertEq(remaining, LAUNCH_DURATION);

        vm.warp(block.timestamp + 1 days);
        remaining = launch.getTimeRemaining();
        assertEq(remaining, LAUNCH_DURATION - 1 days);

        vm.warp(block.timestamp + LAUNCH_DURATION + 1);
        remaining = launch.getTimeRemaining();
        assertEq(remaining, 0);
    }

    function test_GetTokenPrice_BeforeContribution() public view {
        uint256 price = launch.getTokenPrice();
        // Price = (hardCap * 1e18) / tokensForSale
        uint256 expected = (HARD_CAP * 1e18) / launch.tokensForSale();
        assertEq(price, expected);
    }

    function test_GetContributors() public {
        vm.prank(alice);
        launch.contribute{value: 10e18}();
        vm.prank(bob);
        launch.contribute{value: 10e18}();

        address[] memory contributors = launch.getContributors();
        assertEq(contributors.length, 2);
        assertEq(contributors[0], alice);
        assertEq(contributors[1], bob);
    }

    function test_GetLaunchInfo() public view {
        (
            string memory _name,
            string memory _symbol,
            uint256 _totalSupply,
            uint256 _hardCap,
            uint256 _softCap,
            uint256 _totalRaised,
            , // _launchEnd
            NanoBondLaunch.LaunchState _state,
            uint256 _contributorCount,
            address _tokenAddress
        ) = launch.getLaunchInfo();

        assertEq(_name, "Test Token");
        assertEq(_symbol, "TEST");
        assertEq(_totalSupply, TOTAL_SUPPLY);
        assertEq(_hardCap, HARD_CAP);
        assertEq(_softCap, SOFT_CAP);
        assertEq(_totalRaised, 0);
        assertEq(uint256(_state), 0); // ACTIVE
        assertEq(_contributorCount, 0);
        assertEq(_tokenAddress, address(launch.token()));
    }

    // ── Withdraw Pending HBAR ─────────────────────
    function test_WithdrawPendingHbar_NoOp() public {
        // No pending HBAR, should fail gracefully
        vm.prank(creator);
        vm.expectRevert("NanoBondLaunch: no pending HBAR");
        launch.withdrawPendingHbar();
    }
}

// ════════════════════════════════════════════════
//            STAKING TESTS
// ════════════════════════════════════════════════

contract NanoBondStakingTest is Test {
    NanoBondFactory public factory;
    NanoBondLaunch public launch;
    NanoBondStaking public staking;
    IERC20 public token;
    MockDEXRouter public dexRouter;

    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 constant HARD_CAP = 100_000e18;
    uint256 constant SOFT_CAP = 25_000e18;
    uint256 constant LP_PERCENT = 1000;               // 10% to LP (minimum)
    uint256 constant STAKING_REWARD_PERCENT = 1500; // 15%
    uint256 constant STAKING_DURATION = 90 days;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);

    function setUp() public {
        dexRouter = new MockDEXRouter();
        factory = new NanoBondFactory(feeRecipient);
        factory.setDexRouter(address(dexRouter));

        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
        vm.deal(bob, 1_000_000e18);
        vm.deal(charlie, 1_000_000e18);

        // Create and finalize a launch so staking gets initialized
        vm.prank(creator);
        (, address launchAddr, address stakingAddr) = factory.createLaunch(
            "Stake Token", "STK", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            7 days, LP_PERCENT, STAKING_REWARD_PERCENT,
            STAKING_DURATION
        );

        launch = NanoBondLaunch(payable(launchAddr));
        staking = NanoBondStaking(stakingAddr);

        // Fill and finalize launch
        vm.prank(alice);
        launch.contribute{value: HARD_CAP}();
        vm.prank(creator);
        launch.finalize();

        assertTrue(staking.initialized());
        token = IERC20(address(launch.token()));

        // Alice claims her tokens so she can stake them
        vm.prank(alice);
        launch.claimTokens();
    }

    // ── Initialization ────────────────────────────
    function test_StakingInitialized() public view {
        assertTrue(staking.initialized());
        assertEq(address(staking.stakingToken()), address(token));
        assertEq(staking.totalRewards(), launch.tokensForStaking());
        assertEq(staking.stakingDuration(), STAKING_DURATION);
    }

    function test_Initialize_RevertAlreadyInitialized() public {
        // Deploy fresh staking contract and init manually
        NanoBondStaking freshStaking = new NanoBondStaking(STAKING_DURATION);
        
        // Give tokens to owner
        deal(address(token), address(this), 1000e18);
        token.approve(address(freshStaking), 1000e18);
        freshStaking.initialize(address(token), 1000e18);

        // Try to init again
        deal(address(token), address(this), 1000e18);
        token.approve(address(freshStaking), 1000e18);
        vm.expectRevert("NanoBondStaking: already initialized");
        freshStaking.initialize(address(token), 1000e18);
    }

    // ── Stake ─────────────────────────────────────
    function test_Stake_Success() public {
        uint256 aliceBalance = token.balanceOf(alice);
        uint256 stakeAmount = aliceBalance / 2;

        vm.prank(alice);
        token.approve(address(staking), stakeAmount);

        vm.expectEmit(true, false, false, true, address(staking));
        emit Staked(alice, stakeAmount);

        vm.prank(alice);
        staking.stake(stakeAmount);

        assertEq(staking.stakedBalance(alice), stakeAmount);
        assertEq(staking.totalStaked(), stakeAmount);
        assertEq(staking.totalStakers(), 1);
        assertTrue(staking.isStaker(alice));
    }

    function test_Stake_MultipleStakers() public {
        // Give Bob some tokens
        uint256 aliceBalance = token.balanceOf(alice);
        deal(address(token), bob, aliceBalance);

        uint256 aliceStake = aliceBalance / 2;
        uint256 bobStake = aliceBalance / 4;

        vm.startPrank(alice);
        token.approve(address(staking), aliceStake);
        staking.stake(aliceStake);
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(staking), bobStake);
        staking.stake(bobStake);
        vm.stopPrank();

        assertEq(staking.totalStakers(), 2);
        assertEq(staking.totalStaked(), aliceStake + bobStake);
    }

    function test_Stake_RevertZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondStaking: zero amount");
        staking.stake(0);
    }

    function test_Stake_RevertNotInitialized() public {
        NanoBondStaking freshStaking = new NanoBondStaking(STAKING_DURATION);
        vm.prank(alice);
        vm.expectRevert("NanoBondStaking: not initialized");
        freshStaking.stake(1e18);
    }

    // ── Unstake ───────────────────────────────────
    function test_Unstake_Success() public {
        uint256 stakeAmount = token.balanceOf(alice) / 2;

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        uint256 balanceBefore = token.balanceOf(alice);

        vm.expectEmit(true, false, false, true, address(staking));
        emit Unstaked(alice, stakeAmount);

        staking.unstake(stakeAmount);
        vm.stopPrank();

        assertEq(token.balanceOf(alice) - balanceBefore, stakeAmount);
        assertEq(staking.stakedBalance(alice), 0);
        assertEq(staking.totalStaked(), 0);
        assertEq(staking.totalStakers(), 0);
        assertFalse(staking.isStaker(alice));
    }

    function test_Unstake_Partial() public {
        uint256 stakeAmount = 100e18;
        uint256 unstakeAmount = 40e18;

        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        staking.unstake(unstakeAmount);
        vm.stopPrank();

        assertEq(staking.stakedBalance(alice), stakeAmount - unstakeAmount);
        assertTrue(staking.isStaker(alice)); // Still a staker
    }

    function test_Unstake_RevertInsufficientBalance() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        vm.expectRevert("NanoBondStaking: insufficient balance");
        staking.unstake(stakeAmount + 1);
        vm.stopPrank();
    }

    // ── Rewards ───────────────────────────────────
    function test_RewardsAccrue_OverTime() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Advance time
        vm.warp(block.timestamp + 30 days);

        uint256 earned = staking.earned(alice);
        assertTrue(earned > 0, "Alice should have earned rewards");
    }

    function test_ClaimReward_Success() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        uint256 earned = staking.earned(alice);
        assertTrue(earned > 0);

        uint256 balanceBefore = token.balanceOf(alice);

        vm.expectEmit(true, false, false, false, address(staking));
        emit RewardClaimed(alice, earned);

        vm.prank(alice);
        staking.claimReward();

        assertEq(token.balanceOf(alice) - balanceBefore, earned);
        assertEq(staking.earned(alice), 0);
    }

    function test_ClaimReward_RevertNoReward() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        // Claim immediately (no rewards accrued)
        vm.expectRevert("NanoBondStaking: no reward");
        staking.claimReward();
        vm.stopPrank();
    }

    function test_RewardDistribution_ProportionalToStake() public {
        uint256 aliceStake = 75e18;
        uint256 bobStake = 25e18;

        deal(address(token), alice, aliceStake);
        deal(address(token), bob, bobStake);

        vm.startPrank(alice);
        token.approve(address(staking), aliceStake);
        staking.stake(aliceStake);
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(staking), bobStake);
        staking.stake(bobStake);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        uint256 aliceEarned = staking.earned(alice);
        uint256 bobEarned = staking.earned(bob);

        // Alice staked 3x more, should earn ~3x more
        assertTrue(aliceEarned > 0 && bobEarned > 0);
        // Ratio should be approximately 3:1 (with tolerance)
        assertApproxEqRel(aliceEarned, bobEarned * 3, 1e16); // 1% tolerance
    }

    // ── Exit ──────────────────────────────────────
    function test_Exit_UnstakesAndClaims() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        uint256 earned = staking.earned(alice);
        uint256 balanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        staking.exit();

        uint256 received = token.balanceOf(alice) - balanceBefore;
        assertEq(received, stakeAmount + earned);
        assertEq(staking.stakedBalance(alice), 0);
        assertEq(staking.earned(alice), 0);
        assertFalse(staking.isStaker(alice));
    }

    // ── GetAPR ────────────────────────────────────
    function test_GetAPR_ZeroWhenNoStakers() public view {
        assertEq(staking.getAPR(), 0);
    }

    function test_GetAPR_NonZeroWhenStaked() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        uint256 apr = staking.getAPR();
        assertTrue(apr > 0);
    }

    // ── GetStakingInfo ────────────────────────────
    function test_GetStakingInfo() public view {
        (
            address _token,
            uint256 _totalStaked,
            uint256 _totalRewards,
            uint256 _rewardRate,
            uint256 _stakingEnd,
            uint256 _totalStakers,
            bool _initialized
        ) = staking.getStakingInfo();

        assertEq(_token, address(token));
        assertEq(_totalStaked, 0);
        assertEq(_totalRewards, launch.tokensForStaking());
        assertTrue(_rewardRate > 0);
        assertEq(_stakingEnd, 0); // Not started until first stake
        assertEq(_totalStakers, 0);
        assertTrue(_initialized);
    }

    // ── GetUserInfo ───────────────────────────────
    function test_GetUserInfo() public {
        uint256 stakeAmount = 50e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        (uint256 staked, uint256 earned, bool isStaker) = staking.getUserInfo(alice);
        assertEq(staked, stakeAmount);
        assertTrue(earned > 0);
        assertTrue(isStaker);
    }

    // ── TransferOwnership ─────────────────────────
    function test_TransferOwnership_RevertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondStaking: not owner");
        staking.transferOwnership(alice);
    }

    // ── StakingEnd auto-set on first stake ────────
    function test_StakingEnd_SetOnFirstStake() public {
        assertEq(staking.stakingEnd(), 0); // Not set yet

        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        // Record block.timestamp right before we stake
        uint256 stakeTime = block.timestamp;

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // stakingEnd is set to block.timestamp (at time of stake) + stakingDuration
        assertEq(staking.stakingEnd(), stakeTime + STAKING_DURATION);
    }

    // ── Reward rate stops at stakingEnd ───────────
    function test_RewardsStopAfterStakingEnd() public {
        uint256 stakeAmount = 100e18;
        deal(address(token), alice, stakeAmount);

        vm.startPrank(alice);
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Progress to shortly after stakingEnd
        vm.warp(block.timestamp + STAKING_DURATION + 1);
        uint256 earnedAtEnd = staking.earned(alice);

        // Wait longer - rewards should not grow
        vm.warp(block.timestamp + 30 days);
        uint256 earnedLater = staking.earned(alice);

        assertEq(earnedAtEnd, earnedLater, "Rewards should not grow after staking period ends");
    }
}

// ════════════════════════════════════════════════
//         INTEGRATION: FULL LAUNCH FLOW
// ════════════════════════════════════════════════

contract NanoBondIntegrationTest is Test {
    NanoBondFactory public factory;
    MockDEXRouter public dexRouter;
    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        dexRouter = new MockDEXRouter();
        factory = new NanoBondFactory(feeRecipient);
        factory.setDexRouter(address(dexRouter));
        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
        vm.deal(bob, 1_000_000e18);
        vm.deal(charlie, 1_000_000e18);
    }

    /// @notice Full lifecycle: create → contribute → finalize → claim → stake → earn → exit
    function test_FullLifecycle() public {
        uint256 hardCap = 100_000e18;
        uint256 softCap = 25_000e18;
        uint256 totalSupply = 1_000_000_000e18;

        // 1. Creator launches
        vm.prank(creator);
        (, address launchAddr, address stakingAddr) = factory.createLaunch(
            "Full Token", "FULL", totalSupply, hardCap, softCap,
            7 days, 1000 /* 10% LP */, 2000, 90 days
        );

        NanoBondLaunch launch = NanoBondLaunch(payable(launchAddr));
        NanoBondStaking staking = NanoBondStaking(stakingAddr);
        IERC20 token = IERC20(address(launch.token()));

        // 2. Contributors participate
        vm.prank(alice);
        launch.contribute{value: 60_000e18}();

        vm.prank(bob);
        launch.contribute{value: 40_000e18}();
        // Total = 100k = hard cap → auto SUCCEEDED

        assertEq(uint256(launch.state()), 1);

        // 3. Finalize
        vm.prank(creator);
        launch.finalize();
        assertEq(uint256(launch.state()), 2);
        assertTrue(staking.initialized());

        // 4. Claim tokens
        vm.prank(alice);
        launch.claimTokens();
        vm.prank(bob);
        launch.claimTokens();

        uint256 aliceTokens = token.balanceOf(alice);
        uint256 bobTokens = token.balanceOf(bob);
        assertTrue(aliceTokens > 0);
        assertTrue(bobTokens > 0);
        // Alice contributed 60%, Bob 40%
        assertApproxEqRel(aliceTokens, bobTokens * 3 / 2, 1e15);

        // 5. Both stake their tokens
        vm.startPrank(alice);
        token.approve(address(staking), aliceTokens);
        staking.stake(aliceTokens);
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(staking), bobTokens);
        staking.stake(bobTokens);
        vm.stopPrank();

        assertEq(staking.totalStakers(), 2);

        // 6. Time passes - rewards accrue
        vm.warp(block.timestamp + 45 days);

        uint256 aliceEarned = staking.earned(alice);
        uint256 bobEarned = staking.earned(bob);
        assertTrue(aliceEarned > 0);
        assertTrue(bobEarned > 0);

        // 7. Exit (unstake + claim rewards)
        vm.prank(alice);
        staking.exit();

        vm.prank(bob);
        staking.exit();

        assertEq(staking.totalStakers(), 0);
        assertTrue(token.balanceOf(alice) > aliceTokens); // Got back stake + rewards
        assertTrue(token.balanceOf(bob) > bobTokens);

        console.log("Full lifecycle complete!");
        console.log("Alice final tokens:", token.balanceOf(alice));
        console.log("Bob final tokens:", token.balanceOf(bob));
    }

    /// @notice Test failed launch: refund path
    function test_FailedLaunch_Refund() public {
        vm.prank(creator);
        (, address launchAddr, ) = factory.createLaunch(
            "Failed Token", "FAIL", 1_000_000e18, 100_000e18, 50_000e18,
            7 days, 1000, 1500, 90 days
        );
        NanoBondLaunch launch = NanoBondLaunch(payable(launchAddr));

        // Contribute below soft cap
        vm.prank(alice);
        launch.contribute{value: 10_000e18}();

        // Let launch expire
        vm.warp(block.timestamp + 7 days + 1);
        launch.checkState();

        assertEq(uint256(launch.state()), 3); // FAILED

        // Alice claims refund
        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        launch.claimRefund();

        assertEq(alice.balance - balanceBefore, 10_000e18);
    }
}
