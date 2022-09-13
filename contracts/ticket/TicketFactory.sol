//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./TicketProxy.sol";
import "../interfaces/ITicket.sol";

error AlreadyActiveTicketImplementation();

contract TicketFactory is Ownable {
    address public immutable BEACON_ADDRESS;
    address public immutable VRF_CONSUMER;
    
    address[] _deployedProxies;

    event DeployedNewLottery(address indexed newLottery);

    /// @notice Constructs the contract setting the needed dependecies' addresses
    constructor(address _beaconAddress, address _vrfConsumerAddress) {
        BEACON_ADDRESS = _beaconAddress;
        VRF_CONSUMER = _vrfConsumerAddress;
    }

    /// @notice Deploys new ticket proxies
    /// @param _name The name passed to the proxy initizaling function
    /// @param _symbol The symbol passed to the proxy initizaling function
    /// @param _start The start block number passed to the proxy initizaling function
    /// @param _end The end block number passed to the proxy initizaling function
    /// @param _ticketPrice The ticket price passed to the proxy initizaling function
    /// @dev Invokes deployTicketProxyDeterministic() passing 0 as _salt in order to deploy the new proxy using just "create"
    function deployTicketProxy(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice
    ) external onlyOwner {
        deployTicketProxyDeterministic(
            _name,
            _symbol,
            _start,
            _end,
            _ticketPrice,
            0
        );
    }

    /// @notice Deploys new ticket proxies using "create2"
    /// @param _salt The salt passed to "create2" in order to form the address of the new proxy
    /// @dev If _salt == 0 does not use "create2"
    function deployTicketProxyDeterministic(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _ticketPrice,
        uint256 _salt
    ) public onlyOwner {
        address _latestProxy = latestDeployedProxy();
        if (
            _latestProxy != address(0x0) &&
            !ITicket(_latestProxy).finished()
        ) revert AlreadyActiveTicketImplementation();

        address newTicketProxy;
        _salt == 0
            ? newTicketProxy = address(new TicketProxy(BEACON_ADDRESS))
            : newTicketProxy = address(new TicketProxy{salt: bytes32(_salt)}(
            BEACON_ADDRESS
        ));

        ITicket(newTicketProxy).initialize(
            _name,
            _symbol,
            _start,
            _end,
            _ticketPrice,
            VRF_CONSUMER
        );
        _deployedProxies.push(newTicketProxy);
        
        emit DeployedNewLottery(newTicketProxy);
    }

    /// @notice Returns an array of the addresses of all the deployed proxies
    /// @return _deployedProxies All deployed proxies
    function deployedProxies() public view returns (address[] memory) {
        return _deployedProxies;
    }

    /// @notice Returns the latest deployed proxy
    /// @return _latestDeployedProxy The latest ticket proxy deployed
    function latestDeployedProxy() public view returns (address _latestDeployedProxy) {
        address[] memory alreadyDeployedProxies = _deployedProxies;
        alreadyDeployedProxies.length == 0 
         ? _latestDeployedProxy = address(0x0) 
         : _latestDeployedProxy = alreadyDeployedProxies[alreadyDeployedProxies.length - 1];
    }
}