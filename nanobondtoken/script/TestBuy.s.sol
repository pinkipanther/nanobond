// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {NanobondExponentialCurve} from "../src/NanobondExponentialCurve.sol";

contract TestBuy is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address target = 0x417Aa9C551131f8C29fa4151D718BD6A6ef8c870;

        vm.startBroadcast(privateKey);
        try NanobondExponentialCurve(payable(target)).buy{value: 50000000000000}() {
            console.log("Buy successful!");
        } catch Error(string memory reason) {
            console.log("Reverted with:", reason);
        } catch (bytes memory data) {
            console.log("Reverted with bytes");
        }
        vm.stopBroadcast();
    }
}
