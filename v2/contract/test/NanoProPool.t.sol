// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {NanoBondFactory} from "../src/NanoBondFactory.sol";
import {NanoBond} from "../src/NanoBond.sol";
import {NanoProFactory} from "../src/NanoProFactory.sol";
import {NanoProPool} from "../src/NanoProPool.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract NanoProPoolTest is Test {
    NanoBondFactory public bondFactory;
    NanoProFactory public proFactory;
    NanoBond public bond;
    IERC20 public token;
    NanoProPool public pool;

    address public feeRecipient = makeAddr("feeRecipient");
    address public creator = makeAddr("creator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 constant HBAR = 1e8;
    uint256 constant TOTAL_SUPPLY = 1_000_000e18;
    uint256 constant HARD_CAP = 100_000 * HBAR;
    uint256 constant SOFT_CAP = 25_000 * HBAR;

    function setUp() public {
        bondFactory = new NanoBondFactory(feeRecipient);
        proFactory = new NanoProFactory();

        vm.deal(creator, 1_000_000 * HBAR);
        vm.deal(alice, 1_000_000 * HBAR);
        vm.deal(bob, 1_000_000 * HBAR);

        vm.prank(creator);
        (, address bondAddr) = bondFactory.createBond(
            "Trade Bond", "TBOND", "A tradable bond", TOTAL_SUPPLY, HARD_CAP, SOFT_CAP, 7 days, 500, 1 days
        );

        bond = NanoBond(payable(bondAddr));
        token = IERC20(bond.token());

        vm.prank(alice);
        bond.contribute{value: HARD_CAP}();
        vm.prank(alice);
        bond.claimBonds();

        address poolAddr = proFactory.createPool(address(token));
        pool = NanoProPool(payable(poolAddr));
    }

    function test_CreatePool_RecordsTokenPool() public view {
        assertEq(proFactory.getPool(address(token)), address(pool));
        assertEq(pool.token(), address(token));
        assertEq(proFactory.poolCount(), 1);
    }

    function test_CreatePool_RevertDuplicate() public {
        vm.expectRevert("NanoProFactory: pool exists");
        proFactory.createPool(address(token));
    }

    function test_AddLiquidity_Buy_Sell() public {
        uint256 tokenLiquidity = 10_000e18;
        uint256 hbarLiquidity = 1_000 * HBAR;

        vm.prank(alice);
        token.approve(address(pool), tokenLiquidity);
        vm.prank(alice);
        pool.addLiquidity{value: hbarLiquidity}(tokenLiquidity, 1);

        assertEq(pool.reserveHbar(), hbarLiquidity);
        assertEq(pool.reserveToken(), tokenLiquidity);
        assertTrue(pool.balanceOf(alice) > 0);

        uint256 buyValue = 10 * HBAR;
        uint256 expectedTokens = pool.previewBuy(buyValue);
        vm.prank(bob);
        pool.buy{value: buyValue}(expectedTokens);

        assertEq(token.balanceOf(bob), expectedTokens);
        assertEq(pool.reserveHbar(), hbarLiquidity + buyValue);

        uint256 sellAmount = expectedTokens / 2;
        uint256 expectedHbar = pool.previewSell(sellAmount);
        uint256 bobBefore = bob.balance;

        vm.prank(bob);
        token.approve(address(pool), sellAmount);
        vm.prank(bob);
        pool.sell(sellAmount, expectedHbar);

        assertEq(bob.balance - bobBefore, expectedHbar);
        assertEq(token.balanceOf(bob), expectedTokens - sellAmount);
    }

    function test_RemoveLiquidity_ReturnsReserves() public {
        uint256 tokenLiquidity = 10_000e18;
        uint256 hbarLiquidity = 1_000 * HBAR;

        vm.prank(alice);
        token.approve(address(pool), tokenLiquidity);
        vm.prank(alice);
        pool.addLiquidity{value: hbarLiquidity}(tokenLiquidity, 1);

        uint256 lpBalance = pool.balanceOf(alice);
        uint256 aliceHbarBefore = alice.balance;
        uint256 aliceTokenBefore = token.balanceOf(alice);

        vm.prank(alice);
        pool.removeLiquidity(lpBalance, hbarLiquidity, tokenLiquidity);

        assertEq(alice.balance - aliceHbarBefore, hbarLiquidity);
        assertEq(token.balanceOf(alice) - aliceTokenBefore, tokenLiquidity);
        assertEq(pool.reserveHbar(), 0);
        assertEq(pool.reserveToken(), 0);
    }
}
