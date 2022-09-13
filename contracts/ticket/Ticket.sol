//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../interfaces/ITicket.sol";
import "../oracle/WinnerPicker.sol";

import "hardhat/console.sol";

error InvalidInput();
error InvalidAmount();
error Unavailable();
error Unauthorized();
error UnavailableClaim();
error TransactionFailed();
error WinnerAlreadyChosen();

contract Ticket is ITicket, ERC721URIStorageUpgradeable, ReentrancyGuard {
    uint64 public START_BLOCK_NUMBER;
    uint64 public END_BLOCK_NUMBER;

    uint128 public TICKET_PRICE;
    uint128 public id = 0;

    uint256 public winnerTicketId;
    uint256 public surpriseWinnerTicketId;
    uint256 public surpriseWinnerRewardAmount;

    bool public choosenSurpriseWinner;
    bool public choosenWinner;
    bool public payedSurpriseAmount;

    WinnerPicker public WINNER_PICKER;

    event SurpriseWinnerChoosen(address indexed winner, uint256 indexed ticket);
    event WinnerChoosen(address indexed winner, uint256 indexed ticket);

    modifier activeLottery() {
         if (block.number < START_BLOCK_NUMBER ||
             block.number > END_BLOCK_NUMBER) revert Unavailable();
          _;
    }

    modifier activeClaim() {
        if(block.number <= END_BLOCK_NUMBER) revert UnavailableClaim();
        _;
    }

    modifier onlyWinnerPicker() {
        if (msg.sender != address(WINNER_PICKER)) revert Unauthorized();
        _;
    }

    modifier activeSurpriseChoose(uint64 blockNumber) {
        if (block.number < blockNumber) revert Unavailable();
         _;
    }

    /// @notice The initializer function of this proxied contracts
    function initialize(
        string calldata _name,
        string calldata _symbol,
        uint64 _start,
        uint64 _end,
        uint128 _price,
        address _winnerPicker
    ) external override initializer {
        if (
            bytes(_name).length == 0 ||
            bytes(_symbol).length == 0 ||
            _price == 0 ||
            _start < block.number ||
            _end <= _start ||
            _winnerPicker == address(0)
        ) revert InvalidInput();

        __ERC721_init_unchained(_name, _symbol);

        WINNER_PICKER = WinnerPicker(_winnerPicker);       
        START_BLOCK_NUMBER = _start;
        END_BLOCK_NUMBER = _end;
        TICKET_PRICE = _price;
    }

    /// @notice Allows users to purchase tickets ones the sale has begun and has not yet finished
    function buyTicket() external payable override activeLottery {
        if (msg.value != TICKET_PRICE) revert InvalidAmount();
        _purchaseTicket("");
    }

    /// @notice Allows users to purchase tickets using token uri
    /// @param _tokenURI The uri of the user's ticket pointing to an off-chain source of data
    function buyTicketWithURI(string calldata _tokenURI) external payable override activeLottery {
        if (msg.value != TICKET_PRICE) revert InvalidAmount();
        _purchaseTicket(_tokenURI);
    }

    /// @notice Selects the winning ticket and saves it as the lottery's surprise winner
    /// @notice Surprise winner will receive half (50%) of the current lottery's gathered funds
    /// @param _randomness Random number passed by the winner_picker contract
    /// @dev Winning ticket id is calculated using modulo division
    function chooseSurpriseWinner(uint256 _randomness) external override onlyWinnerPicker {
        uint256 winningTokenId = _randomness % id;
        surpriseWinnerTicketId = winningTokenId;
        surpriseWinnerRewardAmount = address(this).balance / 2;
        emit SurpriseWinnerChoosen(ownerOf(winningTokenId), winningTokenId);
    }

    /// @notice Selects the winning ticket and saves it as the lottery's big winner
    /// @param _randomness Random number passed by the winner_picker contract
    /// @dev Winning ticket id is calculated using modulo division
    function chooseWinner(uint256 _randomness) external override onlyWinnerPicker {
        uint256 winningTokenId = _randomness % id;
        winnerTicketId = winningTokenId;
        emit WinnerChoosen(ownerOf(winningTokenId), winningTokenId);
    }

    function claimSurpriseReward() external override activeClaim nonReentrant {
        address surpiseWinner = ownerOf(surpriseWinnerTicketId);

        if (msg.sender != surpiseWinner) revert Unauthorized();
        if (payedSurpriseAmount) revert WinnerAlreadyChosen();

        payedSurpriseAmount = true;
        (bool success, ) = msg.sender.call{value: surpriseWinnerRewardAmount}("");
        if (!success) revert TransactionFailed();
    }

    function claimReward() external override activeClaim nonReentrant {
        address winner = ownerOf(winnerTicketId);

        if (msg.sender != winner) revert Unauthorized();

        uint256 rewardAmount;
        if (payedSurpriseAmount) {
            rewardAmount = address(this).balance;
        } else if (!payedSurpriseAmount)
            rewardAmount = address(this).balance - surpriseWinnerRewardAmount;

        (bool success, ) = msg.sender.call{value: rewardAmount}("");
        if (!success) revert TransactionFailed();
    }

    /// @notice Sends request to the vrf consumer to generate a random number for later use
    /// @dev Does not directly pick the winner, instead passes the signature of the callback function
    /// @dev that has to be invoked ones the random number is ready
    function pickRandomWinner() external override 
      activeSurpriseChoose(START_BLOCK_NUMBER + (END_BLOCK_NUMBER - START_BLOCK_NUMBER) / 4)
     {
        if ((block.number < END_BLOCK_NUMBER && choosenSurpriseWinner) ||
            (block.number >= END_BLOCK_NUMBER && choosenWinner)
        ) revert WinnerAlreadyChosen();

        _fundVrfConsumer();

        if (block.number < END_BLOCK_NUMBER) {
            WINNER_PICKER.getRandomNumber("chooseSurpriseWinner(uint256)");
            choosenSurpriseWinner = true;
        } else {
            WINNER_PICKER.getRandomNumber("chooseWinner(uint256)");
            choosenWinner = true;
        }
    }

    /// @notice Tracks whether the sale has started
    /// @return bool A boolean showing whether the sale has started
    function started() public view override returns (bool) {
        return block.number >= START_BLOCK_NUMBER;
    }

    /// @notice Tracks whether the sale has finished
    /// @return bool A boolean showing whether the sale has finished
    function finished() public view override returns (bool) {
        return block.number > END_BLOCK_NUMBER;
    }

    /// @notice Purchases ticket for a user with an optional token uri
    /// @param _tokenURI The uri of the user's ticket pointing to an off-chain source of data
    function _purchaseTicket(string memory _tokenURI) private {
        _mint(msg.sender, id);
        if (bytes(_tokenURI).length != 0) _setTokenURI(id, _tokenURI);
        id++;
    }

    /// @notice In order to later execute the pickWinner() function this contract needs a LINK balance
    /// @dev The user has to approve LINK token transfer for an amount of WINNER_PICKER.fee() before executing this function
    function _fundVrfConsumer() private {
        LinkTokenInterface LINK = WINNER_PICKER.LINK_TOKEN();
        uint256 fee = WINNER_PICKER.fee();
        bool success = LINK.transferFrom(msg.sender, address(WINNER_PICKER), fee);
        if (!success) revert TransactionFailed();
    }
}