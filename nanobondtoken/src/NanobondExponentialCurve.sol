// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0 <0.9.0;
pragma experimental ABIEncoderV2;

import {HederaResponseCodes} from "hedera-system/HederaResponseCodes.sol";
import {HederaTokenService} from "hedera-token-service/HederaTokenService.sol";
import {IHederaTokenService} from "hedera-token-service/IHederaTokenService.sol";
import {ExpiryHelper} from "hedera-token-service/ExpiryHelper.sol";
import {KeyHelper} from "hedera-token-service/KeyHelper.sol";

contract NanobondExponentialCurve is HederaTokenService, ExpiryHelper, KeyHelper {
    address public token;
    address public owner;
    bool public finiteTotalSupplyType = true;

    uint8 public constant decimals = 8;

    bool public curveActive = true;
    uint256 public totalRaisedHbar;
    uint256 public internalTotalSupply;

    uint256 public constant TINYBARS_PER_HBAR = 10 ** 8;

    uint256 public basePrice = 10000; // 0.0001 HBAR = 10,000 tinybars
    uint256 public growthRateBP = 100; // 1% growth
    uint256 public stepSize = 10000 * 10 ** decimals; // Price increases every 10,000 NANO
    uint256 public targetHbarToRaise = 10_000 * TINYBARS_PER_HBAR;

    event TokenCreated(address indexed tokenAddress);
    event Bought(address indexed buyer, uint256 hbarSpent, uint256 tokensMinted, uint256 price);
    event Sold(address indexed seller, uint256 tokensBurned, uint256 hbarReturned, uint256 price);
    event CurveDeactivated(uint256 totalRaised);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenInitialized(address indexed tokenAddress, uint256 creationFeeTinybar);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function initializeToken() external payable onlyOwner {
        require(token == address(0), "TOKEN_ALREADY_INIT");

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](2);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyValueType.CONTRACT_ID, address(this));
        keys[1] = getSingleKey(KeyType.SUPPLY, KeyValueType.CONTRACT_ID, address(this));

        IHederaTokenService.Expiry memory expiry = createAutoRenewExpiry(address(this), 8_000_000);

        IHederaTokenService.HederaToken memory config = IHederaTokenService.HederaToken(
            "Nanobond Token",
            "NANO",
            address(this),
            "",
            finiteTotalSupplyType,
            type(int64).max,
            false,
            keys,
            expiry
        );

        (int256 response, address createdToken) = HederaTokenService.createFungibleToken(
            config,
            0,
            int32(uint32(decimals))
        );
        require(response == HederaResponseCodes.SUCCESS, "CREATE_FAIL");

        token = createdToken;
        emit TokenCreated(createdToken);
        emit TokenInitialized(createdToken, msg.value);
    }

    receive() external payable {
        buy();
    }

    /// @dev Maximum price cap to prevent absurd values (1e30 ≈ 1e22 HBAR)
    uint256 public constant MAX_PRICE = 1e30;

    /// @notice Overflow-safe binary exponentiation: (1 + growthRateBP/1e4) ^ steps
    /// @dev Uses fixed-point arithmetic with base 1e4. If any intermediate
    ///      multiplication would overflow uint256, returns type(uint256).max
    ///      as a sentinel value so that currentPrice() can cap the result.
    function _powGrowth(uint256 steps) internal view returns (uint256) {
        if (steps == 0) return 1e4;

        uint256 factor = 1e4 + growthRateBP;
        uint256 result = 1e4;
        uint256 MAX = type(uint256).max;

        while (steps > 0) {
            if ((steps & 1) == 1) {
                // Check: result * factor would overflow?
                if (result > MAX / factor) return MAX;
                result = (result * factor) / 1e4;
            }
            steps >>= 1;
            if (steps == 0) break;
            // Check: factor * factor would overflow?
            if (factor > MAX / factor) {
                // factor is huge; any remaining odd-bit multiply will also overflow
                return MAX;
            }
            factor = (factor * factor) / 1e4;
        }

        return result;
    }

    /// @notice Returns the current price per token at the given supply level.
    ///         Price grows exponentially with supply but is capped at MAX_PRICE.
    function currentPrice(uint256 supply) public view returns (uint256) {
        if (supply == 0) {
            return basePrice;
        }

        uint256 steps = supply / stepSize;
        uint256 growth = _powGrowth(steps);

        // If growth overflowed, cap at MAX_PRICE
        if (growth == type(uint256).max) {
            return MAX_PRICE;
        }

        // Check: basePrice * growth would overflow?
        if (growth > type(uint256).max / basePrice) {
            return MAX_PRICE;
        }

        uint256 price = (basePrice * growth) / 1e4;
        return price > MAX_PRICE ? MAX_PRICE : price;
    }

    function previewBuy(uint256 hbarAmount) external view returns (uint256 tokensToMint, uint256 price) {
        price = currentPrice(internalTotalSupply);
        require(price > 0, "PRICE_ZERO");
        tokensToMint = (hbarAmount * (10 ** decimals)) / price;
    }

    function previewSell(uint256 amount) external view returns (uint256 hbarToReturn, uint256 price) {
        price = currentPrice(internalTotalSupply);
        hbarToReturn = (amount * price) / (10 ** decimals);
    }

    function buy() public payable {
        require(curveActive, "CURVE_INACTIVE");
        require(token != address(0), "TOKEN_NOT_INIT");
        require(msg.value > 0, "NO_HBAR");

        uint256 price = currentPrice(internalTotalSupply);
        require(price > 0, "PRICE_ZERO");

        uint256 precision = 10 ** decimals;
        uint256 tokensToMint = (msg.value * precision) / price;
        require(tokensToMint > 0, "ZERO_TOKENS");
        require(tokensToMint <= uint256(uint64(type(int64).max)), "MINT_TOO_LARGE");

        totalRaisedHbar += msg.value;
        internalTotalSupply += tokensToMint;

        int64 mintAmount = int64(uint64(tokensToMint));
        bytes[] memory metadata;
        (int256 mintResponse,,) = mintToken(token, mintAmount, metadata);
        require(mintResponse == HederaResponseCodes.SUCCESS, "MINT_FAIL");

        int256 transferResponse = transferToken(token, address(this), msg.sender, mintAmount);
        require(transferResponse == HederaResponseCodes.SUCCESS, "XFER_FAIL");

        emit Bought(msg.sender, msg.value, tokensToMint, price);

        if (curveActive && totalRaisedHbar >= targetHbarToRaise) {
            curveActive = false;
            emit CurveDeactivated(totalRaisedHbar);
        }
    }

    function sell(uint256 amount) external {
        require(token != address(0), "TOKEN_NOT_INIT");
        require(amount > 0, "ZERO_AMOUNT");
        require(amount <= internalTotalSupply, "AMOUNT_GT_SUPPLY");

        uint256 price = currentPrice(internalTotalSupply);
        uint256 hbarToReturn = (amount * price) / (10 ** decimals);
        require(address(this).balance >= hbarToReturn, "INSUFFICIENT_HBAR");

        int64 amt = int64(uint64(amount));
        int64 responseCode = this.transferFrom(token, msg.sender, address(this), amount);
        require(responseCode == HederaResponseCodes.SUCCESS, "XFER_IN_FAIL");

        internalTotalSupply -= amount;

        int64[] memory emptySerials = new int64[](0);
        (int256 burnResponse,) = burnToken(token, amt, emptySerials);
        require(burnResponse == HederaResponseCodes.SUCCESS, "BURN_FAIL");

        payable(msg.sender).transfer(hbarToReturn);
        emit Sold(msg.sender, amount, hbarToReturn, price);
    }

    function withdrawRaised(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "ZERO_ADDR");
        require(amount <= address(this).balance, "BALANCE");
        to.transfer(amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function deactivateCurve() external onlyOwner {
        if (curveActive) {
            curveActive = false;
            emit CurveDeactivated(totalRaisedHbar);
        }
    }

    function updateCurveParams(uint256 newBasePrice, uint256 newGrowthRateBP, uint256 newStepSize) external onlyOwner {
        require(newBasePrice > 0, "BASE_PRICE_ZERO");
        require(newStepSize > 0, "STEP_ZERO");

        basePrice = newBasePrice;
        growthRateBP = newGrowthRateBP;
        stepSize = newStepSize;
    }

    function updateTargetHbarToRaise(uint256 newTargetHbarToRaise) external onlyOwner {
        require(newTargetHbarToRaise > 0, "TARGET_ZERO");
        targetHbarToRaise = newTargetHbarToRaise;
    }
}
