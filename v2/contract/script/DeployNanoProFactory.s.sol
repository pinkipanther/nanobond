// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {NanoProFactory} from "../src/NanoProFactory.sol";

contract DeployNanoProFactoryScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        NanoProFactory factory = new NanoProFactory();
        vm.stopBroadcast();

        console.log("NanoProFactory deployed at:", address(factory));
    }
}
