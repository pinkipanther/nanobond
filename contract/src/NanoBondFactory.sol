// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NanoBond.sol";

/**
 * @title NanoBondFactory
 * @notice Factory for creating NanoBond contracts. Each bond is a standalone
 *         ERC-20 token with raise → auto-stake → yield mechanics.
 */
contract NanoBondFactory {
    // ════════════════════════════════════════════════
    //                   STRUCTS
    // ════════════════════════════════════════════════

    struct BondInfo {
        uint256 id;
        address creator;
        address bondContract;
        string name;
        string symbol;
        string description;
        uint256 yieldRateBps;
        bool active;
    }

    // ════════════════════════════════════════════════
    //                    STATE
    // ════════════════════════════════════════════════

    address public owner;
    address public feeRecipient;
    uint256 public platformFeeBps = 250; // 2.5% default

    address[] public allBonds;
    mapping(uint256 => BondInfo) public bondInfos;
    mapping(address => uint256[]) public creatorBonds;

    // ════════════════════════════════════════════════
    //                   EVENTS
    // ════════════════════════════════════════════════

    event BondCreated(
        uint256 indexed bondId,
        address indexed creator,
        address bondContract,
        string name,
        string symbol,
        uint256 yieldRateBps
    );

    // ════════════════════════════════════════════════
    //                  MODIFIERS
    // ════════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "NanoBondFactory: not owner");
        _;
    }

    // ════════════════════════════════════════════════
    //                CONSTRUCTOR
    // ════════════════════════════════════════════════

    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    // ════════════════════════════════════════════════
    //               CREATE BOND
    // ════════════════════════════════════════════════

    /**
     * @notice Create a new NanoBond.
     * @param _name           Bond token name
     * @param _symbol         Bond token symbol
     * @param _description    Bond description (on-chain metadata)
     * @param _totalSupply    Total token supply (18 decimals)
     * @param _hardCap        Maximum HBAR to raise (in wei)
     * @param _softCap        Minimum HBAR to raise (in wei)
     * @param _raiseDuration  Duration of raise period (seconds)
     * @param _yieldRateBps   Annual yield rate in basis points (500 = 5%)
     * @param _epochDuration  Duration of each yield epoch (seconds)
     */
    function createBond(
        string calldata _name,
        string calldata _symbol,
        string calldata _description,
        uint256 _totalSupply,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _raiseDuration,
        uint256 _yieldRateBps,
        uint256 _epochDuration
    ) external returns (uint256 bondId, address bondAddress) {
        // Validation
        require(bytes(_name).length > 0, "NanoBondFactory: empty name");
        require(_totalSupply > 0, "NanoBondFactory: zero supply");
        require(_hardCap > 0, "NanoBondFactory: zero hard cap");
        require(_softCap > 0 && _softCap <= _hardCap, "NanoBondFactory: invalid soft cap");
        require(_raiseDuration > 0, "NanoBondFactory: zero duration");
        require(_yieldRateBps > 0 && _yieldRateBps <= 50000, "NanoBondFactory: invalid yield rate"); // Max 500% APY
        require(_epochDuration >= 3600, "NanoBondFactory: epoch too short"); // Min 1 hour

        // Deploy bond contract
        NanoBond bond = new NanoBond(
            _name,
            _symbol,
            _description,
            _totalSupply,
            _hardCap,
            _softCap,
            _raiseDuration,
            _yieldRateBps,
            _epochDuration,
            platformFeeBps,
            feeRecipient,
            msg.sender
        );

        bondAddress = address(bond);
        bondId = allBonds.length;

        allBonds.push(bondAddress);
        bondInfos[bondId] = BondInfo({
            id: bondId,
            creator: msg.sender,
            bondContract: bondAddress,
            name: _name,
            symbol: _symbol,
            description: _description,
            yieldRateBps: _yieldRateBps,
            active: true
        });

        creatorBonds[msg.sender].push(bondId);

        emit BondCreated(bondId, msg.sender, bondAddress, _name, _symbol, _yieldRateBps);
    }

    // ════════════════════════════════════════════════
    //                 VIEW FUNCTIONS
    // ════════════════════════════════════════════════

    function bondCount() external view returns (uint256) {
        return allBonds.length;
    }

    function getBond(uint256 bondId) external view returns (BondInfo memory) {
        return bondInfos[bondId];
    }

    function getCreatorBonds(address _creator) external view returns (uint256[] memory) {
        return creatorBonds[_creator];
    }

    function getAllBonds() external view returns (address[] memory) {
        return allBonds;
    }

    // ════════════════════════════════════════════════
    //                 ADMIN
    // ════════════════════════════════════════════════

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "NanoBondFactory: zero address");
        feeRecipient = _feeRecipient;
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "NanoBondFactory: fee too high"); // Max 10%
        platformFeeBps = _feeBps;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "NanoBondFactory: zero address");
        owner = newOwner;
    }
}
