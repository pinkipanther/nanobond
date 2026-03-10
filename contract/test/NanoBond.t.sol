// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {NanoBondFactory} from "../src/NanoBondFactory.sol";
import {NanoBond} from "../src/NanoBond.sol";
import {BondToken} from "../src/BondToken.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// ════════════════════════════════════════════════
//            FACTORY TESTS
// ════════════════════════════════════════════════

contract NanoBondFactoryTest is Test {
    NanoBondFactory public factory;

    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");

    // Default bond params
    string constant NAME = "Test Bond";
    string constant SYMBOL = "TBOND";
    string constant DESC = "A test bond for fundraising";
    uint256 constant TOTAL_SUPPLY = 1_000_000e18;
    uint256 constant HARD_CAP = 100_000e18;
    uint256 constant SOFT_CAP = 25_000e18;
    uint256 constant RAISE_DURATION = 7 days;
    uint256 constant YIELD_RATE = 500;     // 5% APY
    uint256 constant EPOCH_DURATION = 1 days;

    function setUp() public {
        factory = new NanoBondFactory(feeRecipient);
        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
    }

    function test_Constructor() public view {
        assertEq(factory.owner(), address(this));
        assertEq(factory.feeRecipient(), feeRecipient);
        assertEq(factory.platformFeeBps(), 250);
        assertEq(factory.bondCount(), 0);
    }

    function test_CreateBond_Success() public {
        vm.prank(creator);
        (uint256 bondId, address bondAddr) = factory.createBond(
            NAME, SYMBOL, DESC, TOTAL_SUPPLY,
            HARD_CAP, SOFT_CAP, RAISE_DURATION,
            YIELD_RATE, EPOCH_DURATION
        );

        assertEq(bondId, 0);
        assertTrue(bondAddr != address(0));
        assertEq(factory.bondCount(), 1);
        assertEq(factory.allBonds(0), bondAddr);

        NanoBondFactory.BondInfo memory info = factory.getBond(0);
        assertEq(info.creator, creator);
        assertEq(info.name, NAME);
        assertEq(info.symbol, SYMBOL);
        assertEq(info.yieldRateBps, YIELD_RATE);
        assertTrue(info.active);
    }

    function test_CreateBond_RevertZeroSupply() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: zero supply");
        factory.createBond(NAME, SYMBOL, DESC, 0, HARD_CAP, SOFT_CAP, RAISE_DURATION, YIELD_RATE, EPOCH_DURATION);
    }

    function test_CreateBond_RevertInvalidSoftCap() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: invalid soft cap");
        factory.createBond(NAME, SYMBOL, DESC, TOTAL_SUPPLY, HARD_CAP, HARD_CAP + 1, RAISE_DURATION, YIELD_RATE, EPOCH_DURATION);
    }

    function test_CreateBond_RevertEpochTooShort() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: epoch too short");
        factory.createBond(NAME, SYMBOL, DESC, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, RAISE_DURATION, YIELD_RATE, 60); // 1 min
    }

    function test_CreateBond_RevertInvalidYieldRate() public {
        vm.prank(creator);
        vm.expectRevert("NanoBondFactory: invalid yield rate");
        factory.createBond(NAME, SYMBOL, DESC, TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, RAISE_DURATION, 50001, EPOCH_DURATION);
    }

    function test_Admin_SetFeeRecipient() public {
        address newRecipient = makeAddr("newRecipient");
        factory.setFeeRecipient(newRecipient);
        assertEq(factory.feeRecipient(), newRecipient);
    }

    function test_Admin_SetPlatformFee() public {
        factory.setPlatformFee(500);
        assertEq(factory.platformFeeBps(), 500);
    }

    function test_Admin_RevertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("NanoBondFactory: not owner");
        factory.setFeeRecipient(alice);
    }
}

// ════════════════════════════════════════════════
//            BOND TESTS
// ════════════════════════════════════════════════

contract NanoBondTest is Test {
    NanoBondFactory public factory;
    NanoBond public bond;
    IERC20 public token;

    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 constant TOTAL_SUPPLY = 1_000_000e18;
    uint256 constant HARD_CAP = 100_000e18;
    uint256 constant SOFT_CAP = 25_000e18;
    uint256 constant RAISE_DURATION = 7 days;
    uint256 constant YIELD_RATE = 500;     // 5% APY
    uint256 constant EPOCH_DURATION = 1 days;

    function setUp() public {
        factory = new NanoBondFactory(feeRecipient);
        vm.deal(creator, 1_000_000e18);
        vm.deal(alice, 1_000_000e18);
        vm.deal(bob, 1_000_000e18);

        vm.prank(creator);
        (, address bondAddr) = factory.createBond(
            "Test Bond", "TBOND", "A test bond",
            TOTAL_SUPPLY, HARD_CAP, SOFT_CAP,
            RAISE_DURATION, YIELD_RATE, EPOCH_DURATION
        );

        bond = NanoBond(payable(bondAddr));
        token = IERC20(bond.token());
    }

    // ── Contribute ────────────────────────────────

    function test_Contribute_Success() public {
        vm.prank(alice);
        bond.contribute{value: 10_000e18}();

        assertEq(bond.contributions(alice), 10_000e18);
        assertEq(bond.totalRaised(), 10_000e18);
        assertEq(bond.contributorCount(), 1);
    }

    function test_Contribute_AutoSucceeds() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        assertEq(uint256(bond.state()), 1); // ACTIVE
    }

    function test_Contribute_RevertAfterDeadline() public {
        vm.warp(block.timestamp + RAISE_DURATION + 1);
        vm.prank(alice);
        vm.expectRevert("NanoBond: raise ended");
        bond.contribute{value: 1e18}();
    }

    function test_Contribute_RevertExceedsHardCap() public {
        vm.prank(alice);
        vm.expectRevert("NanoBond: exceeds hard cap");
        bond.contribute{value: HARD_CAP + 1}();
    }

    // ── Check State ──────────────────────────────

    function test_CheckState_Succeeds() public {
        vm.prank(alice);
        bond.contribute{value: SOFT_CAP}();

        vm.warp(block.timestamp + RAISE_DURATION + 1);
        bond.checkState();

        assertEq(uint256(bond.state()), 1); // ACTIVE
    }

    function test_CheckState_Fails() public {
        vm.prank(alice);
        bond.contribute{value: SOFT_CAP - 1}();

        vm.warp(block.timestamp + RAISE_DURATION + 1);
        bond.checkState();

        assertEq(uint256(bond.state()), 3); // FAILED
    }

    // ── Activate ─────────────────────────────────

    function test_Activate_Success() public {
        vm.prank(alice);
        bond.contribute{value: SOFT_CAP}();

        vm.prank(creator);
        bond.activate();

        assertEq(uint256(bond.state()), 1); // ACTIVE
        // Creator should have received tokens
        assertTrue(token.balanceOf(creator) > 0);
    }

    function test_Activate_RevertNotCreator() public {
        vm.prank(alice);
        bond.contribute{value: SOFT_CAP}();

        vm.prank(alice);
        vm.expectRevert("NanoBond: not creator");
        bond.activate();
    }

    // ── Claim Bonds (auto-stake) ─────────────────

    function test_ClaimBonds_AutoStakes() public {
        // Fill to hard cap
        vm.prank(alice);
        bond.contribute{value: 60_000e18}();
        vm.prank(bob);
        bond.contribute{value: 40_000e18}();
        // Auto-ACTIVE at hard cap

        vm.prank(alice);
        bond.claimBonds();

        assertTrue(bond.stakedBalance(alice) > 0);
        assertTrue(bond.totalStaked() > 0);
        assertTrue(bond.hasClaimed(alice));
    }

    function test_ClaimBonds_ProportionalDistribution() public {
        vm.prank(alice);
        bond.contribute{value: 60_000e18}();
        vm.prank(bob);
        bond.contribute{value: 40_000e18}();

        vm.prank(alice);
        bond.claimBonds();
        uint256 aliceStaked = bond.stakedBalance(alice);

        vm.prank(bob);
        bond.claimBonds();
        uint256 bobStaked = bond.stakedBalance(bob);

        // Alice contributed 60%, Bob 40%
        assertApproxEqRel(aliceStaked, bobStaked * 3 / 2, 1e15);
    }

    function test_ClaimBonds_RevertAlreadyClaimed() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        bond.claimBonds();

        vm.prank(alice);
        vm.expectRevert("NanoBond: already claimed");
        bond.claimBonds();
    }

    // ── Yield Distribution ───────────────────────

    function test_Yield_Distributes() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        bond.claimBonds();

        uint256 stakedBefore = bond.totalStaked();

        // Advance 1 epoch
        vm.warp(block.timestamp + EPOCH_DURATION);
        bond.distributeYield();

        assertTrue(bond.totalYieldMinted() > 0);
        // Pending yield should be > 0
        assertTrue(bond.pendingYield(alice) > 0);
    }

    function test_Yield_RevertEpochNotComplete() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        bond.claimBonds();

        // Don't advance time
        vm.expectRevert("NanoBond: epoch not complete");
        bond.distributeYield();
    }

    function test_Yield_ClaimRewards() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        bond.claimBonds();

        // Advance 7 epochs
        vm.warp(block.timestamp + 7 * EPOCH_DURATION);
        bond.distributeYield();

        uint256 pending = bond.pendingYield(alice);
        assertTrue(pending > 0);

        vm.prank(alice);
        bond.claimYield();

        assertEq(token.balanceOf(alice), pending);
    }

    // ── Unstake ──────────────────────────────────

    function test_Unstake_Success() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        bond.claimBonds();

        uint256 staked = bond.stakedBalance(alice);
        assertTrue(staked > 0);

        vm.prank(alice);
        bond.unstake(staked);

        assertEq(bond.stakedBalance(alice), 0);
        assertEq(token.balanceOf(alice), staked);
    }

    function test_Unstake_RevertInsufficientStake() public {
        vm.prank(alice);
        vm.expectRevert("NanoBond: insufficient stake");
        bond.unstake(1);
    }

    // ── Admin Withdraw HBAR ──────────────────────

    function test_WithdrawHbar_Success() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        uint256 withdrawable = bond.withdrawableHbar();
        assertTrue(withdrawable > 0);

        uint256 creatorBefore = creator.balance;
        vm.prank(creator);
        bond.withdrawHbar(withdrawable);

        assertEq(creator.balance - creatorBefore, withdrawable);
    }

    function test_WithdrawHbar_RevertNotCreator() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(alice);
        vm.expectRevert("NanoBond: not creator");
        bond.withdrawHbar(1);
    }

    function test_WithdrawHbar_RevertExceedsWithdrawable() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();

        vm.prank(creator);
        vm.expectRevert("NanoBond: exceeds withdrawable");
        bond.withdrawHbar(HARD_CAP + 1);
    }

    // ── Cancel & Refund ──────────────────────────

    function test_Cancel_Success() public {
        vm.prank(creator);
        bond.cancel();
        assertEq(uint256(bond.state()), 4); // CANCELLED
    }

    function test_Cancel_Refund() public {
        vm.prank(alice);
        bond.contribute{value: 10_000e18}();

        vm.prank(creator);
        bond.cancel();

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        bond.claimRefund();

        assertEq(alice.balance - balanceBefore, 10_000e18);
    }

    // ── View Functions ───────────────────────────

    function test_GetProgress() public {
        vm.prank(alice);
        bond.contribute{value: HARD_CAP / 2}();

        assertEq(bond.getProgress(), 5000); // 50%
    }

    function test_GetBondInfo() public view {
        (
            string memory _name,
            string memory _symbol,
            string memory _description,
            , , , , ,
            NanoBond.BondState _state,
            , , , , ,
        ) = bond.getBondInfo();

        assertEq(_name, "Test Bond");
        assertEq(_symbol, "TBOND");
        assertEq(_description, "A test bond");
        assertEq(uint256(_state), 0); // RAISING
    }

    // ── Full Lifecycle ───────────────────────────

    function test_FullLifecycle() public {
        // 1. Contribute
        vm.prank(alice);
        bond.contribute{value: 60_000e18}();
        vm.prank(bob);
        bond.contribute{value: 40_000e18}();
        assertEq(uint256(bond.state()), 1); // ACTIVE

        // 2. Claim bonds (auto-staked)
        vm.prank(alice);
        bond.claimBonds();
        vm.prank(bob);
        bond.claimBonds();

        assertTrue(bond.totalStaked() > 0);

        // 3. Creator withdraws HBAR
        uint256 withdrawable = bond.withdrawableHbar();
        vm.prank(creator);
        bond.withdrawHbar(withdrawable);

        // 4. Time passes — yield accrues
        vm.warp(block.timestamp + 30 days);
        bond.distributeYield();

        // 5. Alice claims yield
        uint256 alicePending = bond.pendingYield(alice);
        assertTrue(alicePending > 0);

        vm.prank(alice);
        bond.claimYield();
        assertEq(token.balanceOf(alice), alicePending);

        // 6. Bob unstakes, then claims yield
        uint256 bobPending = bond.pendingYield(bob);
        vm.prank(bob);
        bond.claimYield();

        uint256 bobStaked = bond.stakedBalance(bob);
        vm.prank(bob);
        bond.unstake(bobStaked);

        assertEq(bond.stakedBalance(bob), 0);
        assertEq(token.balanceOf(bob), bobPending + bobStaked);

        console.log("Full lifecycle complete!");
        console.log("Alice yield claimed:", alicePending);
        console.log("Bob yield + unstaked:", token.balanceOf(bob));
        console.log("Total yield minted:", bond.totalYieldMinted());
    }
}
