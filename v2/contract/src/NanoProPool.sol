// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title NanoProPool
 * @notice Constant-product HBAR/ERC-20 pool for NanoBond secondary markets.
 */
contract NanoProPool is ERC20 {
    uint256 public constant FEE_BPS = 30;
    uint256 private constant BPS = 10_000;

    address public immutable token;
    address public immutable factory;

    uint256 public reserveToken;
    uint256 public reserveHbar;

    bool private _locked;

    event LiquidityAdded(address indexed provider, uint256 hbarAmount, uint256 tokenAmount, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 hbarAmount, uint256 tokenAmount, uint256 lpBurned);
    event Bought(address indexed buyer, uint256 hbarIn, uint256 tokensOut);
    event Sold(address indexed seller, uint256 tokensIn, uint256 hbarOut);

    modifier nonReentrant() {
        require(!_locked, "NanoProPool: reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address _token) ERC20("Nano Pro LP", "NPLP") {
        require(_token != address(0), "NanoProPool: zero token");
        token = _token;
        factory = msg.sender;
    }

    function addLiquidity(uint256 maxTokenAmount, uint256 minLpOut)
        external
        payable
        nonReentrant
        returns (uint256 lpMinted, uint256 tokenAmount)
    {
        require(msg.value > 0, "NanoProPool: zero hbar");
        require(maxTokenAmount > 0, "NanoProPool: zero token");

        uint256 supply = totalSupply();
        if (supply == 0) {
            tokenAmount = maxTokenAmount;
            lpMinted = _sqrt(msg.value * tokenAmount);
        } else {
            tokenAmount = (msg.value * reserveToken) / reserveHbar;
            require(tokenAmount <= maxTokenAmount, "NanoProPool: token max");
            uint256 lpFromHbar = (msg.value * supply) / reserveHbar;
            uint256 lpFromToken = (tokenAmount * supply) / reserveToken;
            lpMinted = lpFromHbar < lpFromToken ? lpFromHbar : lpFromToken;
        }

        require(lpMinted >= minLpOut && lpMinted > 0, "NanoProPool: lp slippage");
        require(
            IERC20(token).transferFrom(msg.sender, address(this), tokenAmount), "NanoProPool: token transfer failed"
        );

        reserveHbar += msg.value;
        reserveToken += tokenAmount;
        _mint(msg.sender, lpMinted);

        emit LiquidityAdded(msg.sender, msg.value, tokenAmount, lpMinted);
    }

    function removeLiquidity(uint256 lpAmount, uint256 minHbarOut, uint256 minTokenOut)
        external
        nonReentrant
        returns (uint256 hbarOut, uint256 tokenOut)
    {
        require(lpAmount > 0, "NanoProPool: zero lp");
        uint256 supply = totalSupply();
        hbarOut = (lpAmount * reserveHbar) / supply;
        tokenOut = (lpAmount * reserveToken) / supply;
        require(hbarOut >= minHbarOut, "NanoProPool: hbar slippage");
        require(tokenOut >= minTokenOut, "NanoProPool: token slippage");

        _burn(msg.sender, lpAmount);
        reserveHbar -= hbarOut;
        reserveToken -= tokenOut;

        require(IERC20(token).transfer(msg.sender, tokenOut), "NanoProPool: token transfer failed");
        (bool sent,) = payable(msg.sender).call{value: hbarOut}("");
        require(sent, "NanoProPool: hbar transfer failed");

        emit LiquidityRemoved(msg.sender, hbarOut, tokenOut, lpAmount);
    }

    function buy(uint256 minTokensOut) external payable nonReentrant returns (uint256 tokensOut) {
        require(msg.value > 0, "NanoProPool: zero hbar");
        tokensOut = previewBuy(msg.value);
        require(tokensOut >= minTokensOut && tokensOut > 0, "NanoProPool: token slippage");
        require(tokensOut < reserveToken, "NanoProPool: insufficient tokens");

        reserveHbar += msg.value;
        reserveToken -= tokensOut;
        require(IERC20(token).transfer(msg.sender, tokensOut), "NanoProPool: token transfer failed");

        emit Bought(msg.sender, msg.value, tokensOut);
    }

    function sell(uint256 tokenAmount, uint256 minHbarOut) external nonReentrant returns (uint256 hbarOut) {
        require(tokenAmount > 0, "NanoProPool: zero token");
        hbarOut = previewSell(tokenAmount);
        require(hbarOut >= minHbarOut && hbarOut > 0, "NanoProPool: hbar slippage");
        require(hbarOut < reserveHbar, "NanoProPool: insufficient hbar");

        require(
            IERC20(token).transferFrom(msg.sender, address(this), tokenAmount), "NanoProPool: token transfer failed"
        );
        reserveToken += tokenAmount;
        reserveHbar -= hbarOut;

        (bool sent,) = payable(msg.sender).call{value: hbarOut}("");
        require(sent, "NanoProPool: hbar transfer failed");

        emit Sold(msg.sender, tokenAmount, hbarOut);
    }

    function previewBuy(uint256 hbarIn) public view returns (uint256) {
        if (hbarIn == 0 || reserveHbar == 0 || reserveToken == 0) return 0;
        uint256 amountInWithFee = hbarIn * (BPS - FEE_BPS);
        return (reserveToken * amountInWithFee) / (reserveHbar * BPS + amountInWithFee);
    }

    function previewSell(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0 || reserveHbar == 0 || reserveToken == 0) return 0;
        uint256 amountInWithFee = tokenAmount * (BPS - FEE_BPS);
        return (reserveHbar * amountInWithFee) / (reserveToken * BPS + amountInWithFee);
    }

    function spotPrice() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return (reserveHbar * 1e18) / reserveToken;
    }

    function _sqrt(uint256 value) internal pure returns (uint256 result) {
        if (value == 0) return 0;
        uint256 x = value;
        result = (x + 1) / 2;
        while (result < x) {
            x = result;
            result = (value / result + result) / 2;
        }
        return x;
    }

    receive() external payable {
        revert("NanoProPool: use addLiquidity");
    }
}
