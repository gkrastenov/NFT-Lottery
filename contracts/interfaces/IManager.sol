//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IManager {
    /// @notice Initialize the contract setting the needed Ticket implementation contract and VRF Consumer contract
    function initializeLottery(address implementation_, address winnerPicker_) external;

    /// @notice Changes the address of the logic/implementation contract used in the lottery manager
    function changeImplementation(address newImplementation) external;

    /// @notice Calls the deployTicketProxy function of the Ticketfactory
    function deployTicketProxy(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice
    ) external ;

    /// @notice Calls the deployTicketProxyDeterministic function of the factory
    function deployTicketProxyDeterministic(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice,
        uint128 _salt
    ) external;

    /// @notice Transfers both the beacon and factory ownership to a single account
    function transferLotteryOwnership(address newOwner) external;
}