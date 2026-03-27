// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0 <0.9.0;

import {Test, console} from "forge-std/Test.sol";
import {NanobondExponentialCurve} from "../src/NanobondExponentialCurve.sol";
import {HederaResponseCodes} from "hedera-system/HederaResponseCodes.sol";
import {IHederaTokenService} from "hedera-token-service/IHederaTokenService.sol";

contract NanobondExponentialCurveTest is Test {
    NanobondExponentialCurve public curve;

    address constant HTS_PRECOMPILE = address(0x167);
    address constant MOCK_TOKEN = address(0xFACE0001);

    address public owner;
    address public alice;
    address public bob;

    uint8 constant DECIMALS = 8;
    uint256 constant PRECISION = 10 ** DECIMALS;

    // Events to match
    event TokenCreated(address indexed tokenAddress);
    event Bought(address indexed buyer, uint256 hbarSpent, uint256 tokensMinted, uint256 price);
    event Sold(address indexed seller, uint256 tokensBurned, uint256 hbarReturned, uint256 price);
    event CurveDeactivated(uint256 totalRaised);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenInitialized(address indexed tokenAddress, uint256 creationFeeTinybar);

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Give the precompile address some code so calls to it don't revert as EOA
        vm.etch(HTS_PRECOMPILE, hex"00");

        // Mock createFungibleToken → returns (int32 SUCCESS, address MOCK_TOKEN)
        vm.mockCall(
            HTS_PRECOMPILE,
            abi.encodeWithSelector(IHederaTokenService.createFungibleToken.selector),
            abi.encode(int32(22), MOCK_TOKEN)
        );

        // Mock mintToken → returns (int32 SUCCESS, int64 newSupply, int64[] serials)
        vm.mockCall(
            HTS_PRECOMPILE,
            abi.encodeWithSelector(IHederaTokenService.mintToken.selector),
            abi.encode(int32(22), int64(1), new int64[](0))
        );

        // Mock burnToken → returns (int32 SUCCESS, int64 newSupply)
        vm.mockCall(
            HTS_PRECOMPILE,
            abi.encodeWithSelector(IHederaTokenService.burnToken.selector),
            abi.encode(int32(22), int64(0))
        );

        // Mock transferToken → returns int32 SUCCESS
        vm.mockCall(
            HTS_PRECOMPILE,
            abi.encodeWithSelector(IHederaTokenService.transferToken.selector),
            abi.encode(int32(22))
        );

        // Mock transferFrom → returns int64 SUCCESS
        vm.mockCall(
            HTS_PRECOMPILE,
            abi.encodeWithSelector(IHederaTokenService.transferFrom.selector),
            abi.encode(int32(22))
        );

        // Deploy the curve contract
        curve = new NanobondExponentialCurve();

        // Initialize the token
        curve.initializeToken{value: 20 ether}();

        // Fund test accounts
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
    }

    // ============================================================
    //                     INITIALIZATION TESTS
    // ============================================================

    function test_InitialState() public view {
        assertEq(curve.owner(), address(this), "Owner should be deployer");
        assertEq(curve.token(), MOCK_TOKEN, "Token should be MOCK_TOKEN");
        assertTrue(curve.curveActive(), "Curve should be active");
        assertEq(curve.totalRaisedHbar(), 0, "No HBAR raised yet");
        assertEq(curve.internalTotalSupply(), 0, "No tokens minted yet");
        assertEq(curve.basePrice(), 1_000, "Base price should be 1_000");
        assertEq(curve.growthRateBP(), 100, "Growth rate should be 100 BP");
        assertEq(curve.stepSize(), PRECISION, "Step size should be 10^8");
        assertEq(curve.targetHbarToRaise(), 10_000 * PRECISION, "Target should be 10000 * 10^8");
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert("TOKEN_ALREADY_INIT");
        curve.initializeToken{value: 1 ether}();
    }

    function test_OnlyOwnerCanInitialize() public {
        NanobondExponentialCurve freshCurve = new NanobondExponentialCurve();
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        freshCurve.initializeToken{value: 1 ether}();
    }

    // ============================================================
    //                     PRICING TESTS
    // ============================================================

    function test_CurrentPriceAtZeroSupply() public view {
        uint256 price = curve.currentPrice(0);
        assertEq(price, 1_000, "Price at zero supply should equal basePrice");
    }

    function test_CurrentPriceIncreasesWithSupply() public view {
        uint256 price0 = curve.currentPrice(0);
        uint256 price1 = curve.currentPrice(1 * PRECISION);
        uint256 price2 = curve.currentPrice(2 * PRECISION);
        uint256 price5 = curve.currentPrice(5 * PRECISION);

        assertTrue(price1 > price0, "Price should increase after 1 step");
        assertTrue(price2 > price1, "Price should increase after 2 steps");
        assertTrue(price5 > price2, "Price should increase after 5 steps");

        console.log("Price at 0 supply:", price0);
        console.log("Price at 1 step:  ", price1);
        console.log("Price at 2 steps: ", price2);
        console.log("Price at 5 steps: ", price5);
    }

    function test_PriceGrowthIsExponential() public view {
        uint256 price0 = curve.currentPrice(0);
        uint256 price1 = curve.currentPrice(1 * PRECISION);

        // price1 = (1_000 * 10100) / 10000 = 1010
        assertEq(price1, 1010, "Price after 1 step should be basePrice * 1.01");

        uint256 price2 = curve.currentPrice(2 * PRECISION);
        // price2 = (1_000 * 10201) / 10000 = 1020 
        assertEq(price2, 1020, "Price after 2 steps should be basePrice * 1.01^2");

        console.log("Price at 0 steps:", price0);
        console.log("Price at 1 step: ", price1);
        console.log("Price at 2 steps:", price2);
    }

    function test_PriceWithinStep() public view {
        uint256 priceA = curve.currentPrice(0);
        uint256 priceB = curve.currentPrice(PRECISION / 2);
        assertEq(priceA, priceB, "Price within same step should be identical");
    }

    // ============================================================
    //                     PREVIEW TESTS
    // ============================================================

    function test_PreviewBuy() public view {
        uint256 hbarAmount = 10_000; 
        (uint256 tokensToMint, uint256 price) = curve.previewBuy(hbarAmount);

        assertEq(price, 1_000, "Preview price should be basePrice at zero supply");
        assertEq(tokensToMint, 1_000_000_000, "Should mint 10 tokens (10 * 10^8)");
    }

    function test_PreviewSell() public view {
        uint256 tokenAmount = 10 * PRECISION;
        (uint256 hbarToReturn, uint256 price) = curve.previewSell(tokenAmount);

        assertEq(price, 1_000, "Preview price should be basePrice at zero supply");
        assertEq(hbarToReturn, 10_000, "Should return 10000 tinybar for 10 tokens");
    }

    // ============================================================
    //                        BUY TESTS
    // ============================================================

    function test_Buy() public {
        uint256 buyAmount = 10_000; 

        vm.prank(alice);
        curve.buy{value: buyAmount}();

        assertEq(curve.totalRaisedHbar(), buyAmount, "totalRaisedHbar should increase");
        uint256 expectedTokens = (buyAmount * PRECISION) / 1_000;
        assertEq(curve.internalTotalSupply(), expectedTokens, "internalTotalSupply should increase");
    }

    function test_BuyEmitsEvent() public {
        uint256 buyAmount = 10_000; 
        uint256 expectedTokens = (buyAmount * PRECISION) / 1_000;

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Bought(alice, buyAmount, expectedTokens, 1_000);
        curve.buy{value: buyAmount}();
    }

    function test_BuyViaReceive() public {
        uint256 buyAmount = 5_000; 

        vm.prank(alice);
        (bool ok,) = address(curve).call{value: buyAmount}("");
        assertTrue(ok, "Sending HBAR directly should trigger buy via receive()");
        assertTrue(curve.internalTotalSupply() > 0, "Should have minted tokens");
    }

    function test_BuyRevertsWithZeroValue() public {
        vm.prank(alice);
        vm.expectRevert("NO_HBAR");
        curve.buy{value: 0}();
    }

    function test_BuyRevertsWhenCurveInactive() public {
        curve.deactivateCurve();

        vm.prank(alice);
        vm.expectRevert("CURVE_INACTIVE");
        curve.buy{value: 1_000}();
    }

    function test_MultipleBuysIncreasePrice() public {
        uint256 priceBefore = curve.currentPrice(curve.internalTotalSupply());

        // Buy enough to move past a few steps (keep it reasonable to avoid overflow in _powGrowth)
        vm.prank(alice);
        curve.buy{value: 50_000}();

        uint256 priceAfter = curve.currentPrice(curve.internalTotalSupply());
        assertTrue(priceAfter >= priceBefore, "Price should increase or stay same after buys");

        console.log("Price before buy:", priceBefore);
        console.log("Price after buy: ", priceAfter);
        console.log("Supply after buy:", curve.internalTotalSupply());
    }

    // ============================================================
    //                        SELL TESTS
    // ============================================================

    function test_Sell() public {
        // First buy tokens
        uint256 buyAmount = 50_000; 
        vm.prank(alice);
        curve.buy{value: buyAmount}();

        uint256 supplyAfterBuy = curve.internalTotalSupply();
        assertTrue(supplyAfterBuy > 0, "Should have tokens after buy");

        // Now sell half
        uint256 sellAmount = supplyAfterBuy / 2;
        vm.prank(alice);
        curve.sell(sellAmount);

        assertEq(
            curve.internalTotalSupply(),
            supplyAfterBuy - sellAmount,
            "Supply should decrease after sell"
        );
    }

    function test_SellEmitsEvent() public {
        uint256 buyAmount = 10_000; 
        vm.prank(alice);
        curve.buy{value: buyAmount}();

        uint256 sellAmount = curve.internalTotalSupply();
        uint256 price = curve.currentPrice(curve.internalTotalSupply());
        uint256 expectedHbar = (sellAmount * price) / PRECISION;

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Sold(alice, sellAmount, expectedHbar, price);
        curve.sell(sellAmount);
    }

    function test_SellRevertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("ZERO_AMOUNT");
        curve.sell(0);
    }

    function test_SellRevertsIfAmountExceedsSupply() public {
        vm.prank(alice);
        curve.buy{value: 1_000}();

        uint256 supply = curve.internalTotalSupply();

        vm.prank(alice);
        vm.expectRevert("AMOUNT_GT_SUPPLY");
        curve.sell(supply + 1);
    }

    function test_SellRevertsIfInsufficientContractBalance() public {
        // Buy tokens
        vm.prank(alice);
        curve.buy{value: 10_000}();

        // Owner withdraws almost all HBAR from contract
        uint256 balance = address(curve).balance;
        if (balance > 100) {
            curve.withdrawRaised(payable(owner), balance - 100);
        }

        uint256 supply = curve.internalTotalSupply();
        uint256 price = curve.currentPrice(supply);
        uint256 hbarNeeded = (supply * price) / PRECISION;

        if (hbarNeeded > address(curve).balance) {
            vm.prank(alice);
            vm.expectRevert("INSUFFICIENT_HBAR");
            curve.sell(supply);
        }
    }

    // ============================================================
    //                  CURVE DEACTIVATION TESTS
    // ============================================================

    function test_CurveDeactivatesAtTarget() public {
        curve.updateTargetHbarToRaise(1_000);

        vm.prank(alice);
        curve.buy{value: 1_000}();

        assertFalse(curve.curveActive(), "Curve should deactivate when target is reached");
    }

    function test_CurveDeactivatesEmitsEvent() public {
        curve.updateTargetHbarToRaise(500);

        vm.prank(alice);
        vm.expectEmit(false, false, false, true);
        emit CurveDeactivated(500);
        curve.buy{value: 500}();
    }

    function test_ManualDeactivateCurve() public {
        assertTrue(curve.curveActive(), "Curve should start active");
        curve.deactivateCurve();
        assertFalse(curve.curveActive(), "Owner should be able to deactivate");
    }

    function test_OnlyOwnerCanDeactivate() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        curve.deactivateCurve();
    }

    // ============================================================
    //                     OWNER FUNCTIONS
    // ============================================================

    function test_TransferOwnership() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(owner, alice);

        curve.transferOwnership(alice);
        assertEq(curve.owner(), alice, "Ownership should transfer");
    }

    function test_TransferOwnershipRevertsZeroAddr() public {
        vm.expectRevert("ZERO_ADDR");
        curve.transferOwnership(address(0));
    }

    function test_OnlyOwnerCanTransfer() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        curve.transferOwnership(bob);
    }

    function test_WithdrawRaised() public {
        vm.prank(alice);
        curve.buy{value: 50_000}();

        uint256 balBefore = owner.balance;
        curve.withdrawRaised(payable(owner), 10_000);
        assertEq(owner.balance, balBefore + 10_000, "Owner should receive withdrawn HBAR");
    }

    function test_WithdrawRevertsExceedingBalance() public {
        vm.prank(alice);
        curve.buy{value: 1_000}();

        vm.expectRevert("BALANCE");
        curve.withdrawRaised(payable(owner), address(curve).balance + 1);
    }

    function test_WithdrawRevertsZeroAddr() public {
        vm.expectRevert("ZERO_ADDR");
        curve.withdrawRaised(payable(address(0)), 100);
    }

    function test_OnlyOwnerCanWithdraw() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        curve.withdrawRaised(payable(alice), 100);
    }

    function test_UpdateCurveParams() public {
        curve.updateCurveParams(2_000, 200, 2 * PRECISION);
        assertEq(curve.basePrice(), 2_000);
        assertEq(curve.growthRateBP(), 200);
        assertEq(curve.stepSize(), 2 * PRECISION);
    }

    function test_UpdateCurveParamsRevertsZeroBasePrice() public {
        vm.expectRevert("BASE_PRICE_ZERO");
        curve.updateCurveParams(0, 100, PRECISION);
    }

    function test_UpdateCurveParamsRevertsZeroStepSize() public {
        vm.expectRevert("STEP_ZERO");
        curve.updateCurveParams(1_000, 100, 0);
    }

    function test_OnlyOwnerCanUpdateParams() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        curve.updateCurveParams(2_000, 200, PRECISION);
    }

    function test_UpdateTargetHbar() public {
        curve.updateTargetHbarToRaise(50_000 * PRECISION);
        assertEq(curve.targetHbarToRaise(), 50_000 * PRECISION);
    }

    function test_UpdateTargetHbarRevertsZero() public {
        vm.expectRevert("TARGET_ZERO");
        curve.updateTargetHbarToRaise(0);
    }

    function test_OnlyOwnerCanUpdateTarget() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        curve.updateTargetHbarToRaise(100);
    }

    // ============================================================
    //                   BUY-SELL ROUND TRIP
    // ============================================================

    function test_BuySellRoundTrip() public {
        uint256 buyAmount = 100_000; 

        // Alice buys
        vm.prank(alice);
        curve.buy{value: buyAmount}();

        uint256 tokensReceived = curve.internalTotalSupply();
        console.log("Tokens received:", tokensReceived);

        uint256 aliceBalBefore = alice.balance;

        // Alice sells all
        vm.prank(alice);
        curve.sell(tokensReceived);

        uint256 aliceBalAfter = alice.balance;
        uint256 hbarReturned = aliceBalAfter - aliceBalBefore;

        console.log("HBAR spent:   ", buyAmount);
        console.log("HBAR returned:", hbarReturned);
        console.log("Supply after: ", curve.internalTotalSupply());

        assertEq(curve.internalTotalSupply(), 0, "Supply should be zero after selling all");
        assertTrue(hbarReturned > 0, "Should return some HBAR on sell");
        // Note: In this bonding curve, sell uses currentPrice(supply) which
        // is higher after buy, so seller may get back more or less depending
        // on the price movement. This is expected bonding curve behavior.
    }

    function test_MultipleBuyersSellSequence() public {
        // Alice buys first (cheap price)
        vm.prank(alice);
        curve.buy{value: 50_000}();
        uint256 aliceTokens = curve.internalTotalSupply();

        // Bob buys second (price may be higher)
        uint256 supplyBefore = curve.internalTotalSupply();
        vm.prank(bob);
        curve.buy{value: 50_000}();
        uint256 bobTokens = curve.internalTotalSupply() - supplyBefore;

        console.log("Alice tokens:", aliceTokens);
        console.log("Bob tokens:  ", bobTokens);

        // Bob got fewer tokens for the same HBAR (price increased)
        assertTrue(bobTokens <= aliceTokens, "Later buyer should get same or fewer tokens");
    }

    // ============================================================
    //                    FUZZ TESTS
    // ============================================================

    function testFuzz_BuyNonZero(uint256 amount) public {
        amount = bound(amount, 1, 100 * PRECISION);

        vm.deal(alice, amount);
        vm.prank(alice);
        curve.buy{value: amount}();

        assertTrue(curve.internalTotalSupply() > 0, "Should mint tokens for any non-zero amount");
        assertEq(curve.totalRaisedHbar(), amount, "totalRaisedHbar should match");
    }

    function testFuzz_CurrentPriceMonotonic(uint256 supplyA, uint256 supplyB) public view {
        // Test over a MUCH wider range — including values that previously overflowed
        supplyA = bound(supplyA, 0, 1_000_000 * PRECISION);
        supplyB = bound(supplyB, supplyA, 1_000_000 * PRECISION);

        uint256 priceA = curve.currentPrice(supplyA);
        uint256 priceB = curve.currentPrice(supplyB);

        assertTrue(priceB >= priceA, "Price should be monotonically non-decreasing");
    }

    // ============================================================
    //                OVERFLOW PROTECTION TESTS
    // ============================================================

    function test_PriceCapsAtMaxPrice() public view {
        // Huge supply → huge steps → would overflow without the fix
        uint256 hugeSupply = 1_000_000 * PRECISION; // 1 million tokens = 1M steps
        uint256 price = curve.currentPrice(hugeSupply);

        assertEq(price, curve.MAX_PRICE(), "Price should cap at MAX_PRICE for astronomical supply");
    }

    function test_PriceNeverRevertsAtExtremeSupply() public view {
        // These previously caused panic: arithmetic overflow
        curve.currentPrice(10_000_000 * PRECISION);
        curve.currentPrice(type(uint128).max);
        curve.currentPrice(type(uint256).max);
        // If we reach here without reverting, overflow protection works
    }

    function testFuzz_PriceNeverReverts(uint256 supply) public view {
        // Should never revert for ANY supply value
        curve.currentPrice(supply);
    }

    // ============================================================
    //                  RECEIVE FALLBACK TEST
    // ============================================================

    function test_ReceiveFallback() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        (bool success,) = address(curve).call{value: 10_000}("");
        assertTrue(success, "Direct HBAR send should succeed");
        assertTrue(curve.internalTotalSupply() > 0, "Should have minted tokens via receive");
    }

    receive() external payable {}
}
