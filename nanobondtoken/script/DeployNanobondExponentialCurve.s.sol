// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {NanobondExponentialCurve} from "../src/NanobondExponentialCurve.sol";

contract DeployNanobondExponentialCurveScript is Script {
    function run() external returns (NanobondExponentialCurve deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        deployed = new NanobondExponentialCurve();
        vm.stopBroadcast();

        console.log("NanobondExponentialCurve deployed at:", address(deployed));
        console.log("");
        console.log("Next step - initialize the token by running:");
        console.log("  cast send <DEPLOYED_ADDRESS> 'initializeToken()' --value <FEE_IN_TINYBAR> --rpc-url <RPC_URL> --private-key <PK>");
    }
}
