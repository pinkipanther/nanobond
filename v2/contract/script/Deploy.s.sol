// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {NanoBondFactory} from "../src/NanoBondFactory.sol";

contract DeployScript is Script {
    function run() external {
        // Load private key from .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envOr("FEE_RECIPIENT", vm.addr(deployerPrivateKey));

        console.log("Deploying NanoBond contracts...");
        console.log("Deployer Address:", vm.addr(deployerPrivateKey));
        console.log("Fee Recipient Address:", feeRecipient);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the NanoBondFactory
        NanoBondFactory factory = new NanoBondFactory(feeRecipient);

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("NanoBondFactory Deployed at:", address(factory));
        console.log("==================================================");
        console.log("Please update your frontend constants with this address!");
    }
}
