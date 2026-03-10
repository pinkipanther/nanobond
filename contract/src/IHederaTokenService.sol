// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

/// @notice Minimal IHederaTokenService interface matching the official Hedera precompile at 0x167.
/// Types MUST match exactly (int64/int32, not uint256/uint32) or the ABI encoding differs
/// and the precompile silently returns an error code.
interface IHederaTokenService {

    struct Expiry {
        // The epoch second at which the token should expire
        int64 second;
        // Account which will be automatically charged to renew the token's expiration
        address autoRenewAccount;
        // The interval at which the auto-renew account will be charged to extend the token's expiry
        int64 autoRenewPeriod;
    }

    struct KeyValue {
        // if true, the key of the calling Hedera account will be inherited as the token key
        bool inheritAccountKey;
        // smart contract instance that is authorized as if it had signed with a key
        address contractId;
        // Ed25519 public key bytes
        bytes ed25519;
        // Compressed ECDSA(secp256k1) public key bytes
        bytes ECDSA_secp256k1;
        // A smart contract that, if the recipient of the active message frame, should be treated
        // as having signed
        address delegatableContractId;
    }

    struct TokenKey {
        // bit field representing the key type (0=admin, 1=kyc, 2=freeze, 3=wipe, 4=supply, 5=feeSchedule, 6=pause)
        uint keyType;
        // the value that will be set to the key type
        KeyValue key;
    }

    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;       // false = INFINITE, true = FINITE
        int64 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    /// @notice Creates a Fungible Token on the Hedera network
    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) external payable returns (int64 responseCode, address tokenAddress);

    /// @notice Mints tokens to the token's treasury Account
    function mintToken(address token, int64 amount, bytes[] memory metadata)
        external returns (int64 responseCode, int64 newTotalSupply, int64[] memory serialNumbers);

    /// @notice Burns tokens from the token's treasury Account
    function burnToken(address token, int64 amount, int64[] memory serialNumbers)
        external returns (int64 responseCode, int64 newTotalSupply);

    /// @notice Associates the provided account with the provided tokens
    function associateTokens(address account, address[] memory tokens)
        external returns (int64 responseCode);

    /// @notice Single Token Transfer
    function transferToken(address token, address sender, address receiver, int64 amount)
        external returns (int64 responseCode);

    /// @notice Approve spender to spend tokens (HTS-level allowance)
    function approve(address token, address spender, uint256 amount)
        external returns (int64 responseCode);
}