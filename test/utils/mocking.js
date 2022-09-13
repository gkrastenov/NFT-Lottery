const LinkTokenInterface = require('../../artifacts/@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol/LinkTokenInterface.json');
const WinnerPicker = require('../../artifacts/contracts/oracle/WinnerPicker.sol/WinnerPicker.json');

module.exports.deployMockedLink = async function () {
    return waffle.deployMockContract((await hre.ethers.getSigners())[0], LinkTokenInterface.abi);
};

module.exports.deployMockedWinnerPicker = async function () {
    return waffle.deployMockContract((await hre.ethers.getSigners())[0], WinnerPicker.abi);
};