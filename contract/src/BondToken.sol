// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/**
 * @title BondToken
 * @notice Simple ERC-20 token with controlled minting for NanoBond yield distribution.
 * @dev Only the bond contract (minter) can mint new tokens for yield.
 */
contract BondToken is ERC20 {
    address public immutable minter;

    constructor(
        string memory _name,
        string memory _symbol,
        address _minter,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        minter = _minter;
        _mint(_minter, _initialSupply);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "BondToken: not minter");
        _mint(to, amount);
    }
}
