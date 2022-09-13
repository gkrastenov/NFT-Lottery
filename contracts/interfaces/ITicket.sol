//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITicket {
    /// @param name_ Name of this ERC721
    /// @param symbol_ Symbol of this ERC721
    /// @param _start Minting tickets opens from this block number
    /// @param _end Minting tickets is not allowed after this block number
    /// @param _price Constant price of each single ticket
    /// @param _winnerPicker VRFConsumer contract address used to help select a winning token id
    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint64 _start,
        uint64 _end,
        uint128 _price,
        address _winnerPicker
    ) external;

    function buyTicket() external payable;

    function buyTicketWithURI(string calldata _tokenUri) external payable;

    function chooseSurpriseWinner(uint256 _randomness) external;

    function chooseWinner(uint256 _randomness) external;

    function claimSurpriseReward() external;

    function claimReward() external;

    function pickRandomWinner() external;

    function started() external view returns (bool);

    function finished() external view returns (bool);
}