//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

error InsufficientFunds();

/// @notice VRFConsumer contract for generating random number and then passing it to Ticket contracts that requested it
contract WinnerPicker is VRFConsumerBase {
    LinkTokenInterface public immutable LINK_TOKEN;
    address internal immutable _vrfCoordinator;
    bytes32 internal _keyHash;
    uint256 public fee;

    /// @notice request id to contract address that made the request
    mapping(bytes32 => address) internal requests;

    /// @notice request id to callback function signature
    mapping(bytes32 => string) internal callbackSignatures;

    /// @notice Constructs the contract setting the needed chainlink vrf variables
    /// @param vrfCoordinator_ The coordinator address
    /// @param link_ LINK token address
    /// @param keyHash_ The Key hash
    constructor(address vrfCoordinator_, address link_, bytes32 keyHash_) VRFConsumerBase(vrfCoordinator_, link_) {
        _vrfCoordinator = vrfCoordinator_;
        _keyHash = keyHash_;
        LINK_TOKEN = LinkTokenInterface(link_);
        fee = 0.05 * 10**18; // 0.05 LINK
    }

    /// @notice Requests random number from coordinator and saves the request
    /// @param callbackSignature Callback function signature that will be invoked after receiving the random number
    /// @return requestId The request id
    function getRandomNumber(string memory callbackSignature) public returns (bytes32 requestId)
    {
        requestId = requestRandomness(_keyHash, fee);
        requests[requestId] = msg.sender;
        callbackSignatures[requestId] = callbackSignature;
    }

    /// @notice The callback function invoked ones a random number has been generated
    /// @notice Invokes the function at the request creator contract passing the newly generated random number
    /// @dev Throws if request creator contract does not support the corresponding signature
    /// @param requestId The request id this function fulfills
    /// @param randomness The result random number
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        (bool success, ) = requests[requestId].call(
            abi.encodeWithSignature(callbackSignatures[requestId], randomness)
        );
        if (!success) revert();
    }
}