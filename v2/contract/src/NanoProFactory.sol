// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NanoProPool.sol";

contract NanoProFactory {
    address public owner;

    address[] public allPools;
    mapping(address => address) public getPool;

    event PoolCreated(address indexed token, address indexed pool, uint256 poolId);

    constructor() {
        owner = msg.sender;
    }

    function createPool(address token) external returns (address pool) {
        require(token != address(0), "NanoProFactory: zero token");
        require(getPool[token] == address(0), "NanoProFactory: pool exists");

        pool = address(new NanoProPool(token));
        getPool[token] = pool;
        allPools.push(pool);

        emit PoolCreated(token, pool, allPools.length - 1);
    }

    function poolCount() external view returns (uint256) {
        return allPools.length;
    }
}
