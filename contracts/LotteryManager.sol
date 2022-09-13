//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IManager.sol";
import "./ticket/TicketBeacon.sol";
import "./ticket/TicketFactory.sol";

/// @notice Contract used to manage the Lottery system
contract LotteryManager is IManager, Ownable {
    TicketFactory public ticketFactory;
    TicketBeacon public ticketBeacon;

    event ChangedImplementation( address indexed prevImplementation, address indexed newImplementation);
    event TransferredLotteryOwnership(address indexed prevOwner, address indexed newOwner );

    /// @param implementation_ The address of the Ticket implementation that is used in beacon contract
    /// @param winnerPicker_ The VRF Consumer contract address that will be used to fetch the random numbers
    function initializeLottery(address implementation_, address winnerPicker_) external override onlyOwner {
        ticketBeacon = new TicketBeacon(implementation_);
        ticketFactory = new TicketFactory(address(ticketBeacon), winnerPicker_);
    }

    /// @param newImplementation The address of the new implementation that is going to be used by the ticket proxies
    function changeImplementation(address newImplementation) external override onlyOwner {
        address previousImplementation = ticketBeacon.implementation();
        ticketBeacon.upgradeTo(newImplementation);
        emit ChangedImplementation(previousImplementation, newImplementation);
    }

    /// @notice Calls the deployTicketProxy function of the factory
    function deployTicketProxy(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice
    ) external override onlyOwner {
        ticketFactory.deployTicketProxy(
            _name,
            _symbol,
            _start,
            _end,
            _ticketPrice
        );
    }

    /// @notice Calls the deployTicketProxyDeterministic function of the factory
    function deployTicketProxyDeterministic(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice,
        uint128 _salt
    ) external override onlyOwner {
        ticketFactory.deployTicketProxyDeterministic(
            _name,
            _symbol,
            _start,
            _end,
            _ticketPrice,
            _salt
        );
    }

    /// @param newOwner The address of the new Lottery manager
    function transferLotteryOwnership(address newOwner) external override onlyOwner {
        ticketBeacon.transferOwnership(newOwner);
        ticketFactory.transferOwnership(newOwner);
        emit TransferredLotteryOwnership(address(this), newOwner);
    }
}