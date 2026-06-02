// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {NanoBondFactory} from "../src/NanoBondFactory.sol";
import {NanoBond} from "../src/NanoBond.sol";
import {NanoProFactory} from "../src/NanoProFactory.sol";
import {NanoProPool} from "../src/NanoProPool.sol";

contract DeployAndSeedTestnet is Script {
    uint256 internal constant HBAR = 1e8;
    uint256 internal constant WEIBARS_PER_TINYBAR = 1e10;
    uint256 internal constant TOTAL_SUPPLY = 1_000_000e18;
    uint256 internal constant HARD_CAP = 2 * HBAR;
    uint256 internal constant SOFT_CAP = 1 * HBAR;
    uint256 internal constant RAISE_DURATION = 3 days;
    uint256 internal constant YIELD_RATE_BPS = 800; // 8% APR
    uint256 internal constant EPOCH_DURATION = 1 days;
    uint256 internal constant INITIAL_POOL_HBAR = 1 * HBAR;
    uint256 internal constant INITIAL_POOL_TOKENS = 250_000e18;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);

        console.log("Deploying and seeding NanoBond V2 on Hedera testnet");
        console.log("Deployer:", deployer);
        console.log("Fee recipient:", feeRecipient);

        vm.startBroadcast(deployerPrivateKey);

        NanoBondFactory bondFactory = new NanoBondFactory(feeRecipient);
        NanoProFactory proFactory = new NanoProFactory();

        (uint256 bondId, address bondAddress) = bondFactory.createBond(
            "Testnet Growth Bond",
            "TGB",
            "Simple testnet raise for Nano Pro end-to-end verification",
            TOTAL_SUPPLY,
            HARD_CAP,
            SOFT_CAP,
            RAISE_DURATION,
            YIELD_RATE_BPS,
            EPOCH_DURATION
        );

        NanoBond bond = NanoBond(payable(bondAddress));
        address tokenAddress = bond.token();
        IERC20 token = IERC20(tokenAddress);

        bond.contribute{value: _toWeibar(HARD_CAP)}();
        bond.claimBonds();

        uint256 creatorWithdrawable = bond.withdrawableHbar();
        if (creatorWithdrawable > 0) {
            bond.withdrawHbar(creatorWithdrawable);
        }

        address poolAddress = proFactory.createPool(tokenAddress);
        NanoProPool pool = NanoProPool(payable(poolAddress));

        token.approve(poolAddress, INITIAL_POOL_TOKENS);
        pool.addLiquidity{value: _toWeibar(INITIAL_POOL_HBAR)}(INITIAL_POOL_TOKENS, 1);

        vm.stopBroadcast();

        console.log("--------------------------------------------------");
        console.log("BondFactory:", address(bondFactory));
        console.log("ProFactory:", address(proFactory));
        console.log("Bond ID:", bondId);
        console.log("Bond:", bondAddress);
        console.log("Token:", tokenAddress);
        console.log("Pool:", poolAddress);
        console.log("Initial pool HBAR:", INITIAL_POOL_HBAR);
        console.log("Initial pool tokens:", INITIAL_POOL_TOKENS);
        console.log("--------------------------------------------------");
    }

    function _toWeibar(uint256 tinybars) internal pure returns (uint256) {
        return tinybars * WEIBARS_PER_TINYBAR;
    }
}
