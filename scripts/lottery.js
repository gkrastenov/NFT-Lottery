const { ethers } = require("hardhat");

let { GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH} = require('../test/utils/chainlink');

async function main() {
    [deployer] = await ethers.getSigners();
    let chainlinkCredentials = [GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH];

    console.log('\n');
    console.log('>> Network:                                              GOERLI');

    const LotteryManager = await (await ethers.getContractFactory("LotteryManager")).deploy();
    console.log(">> Lottery manager deployed to:                         ", LotteryManager.address);

    const TicketImplementation = await (await ethers.getContractFactory("Ticket")).deploy();
    console.log(">> Ticket contract implementation deployed to:          ", TicketImplementation.address);

    const WinnerPicker = await (await ethers.getContractFactory("WinnerPicker")).deploy(...chainlinkCredentials);
    console.log(">> VRF Consumer winner picker contract deployed to:     ", WinnerPicker.address);

    console.log('\n', " > Setting up the lottery..");
    await LotteryManager.initializeLottery(TicketImplementation.address, WinnerPicker.address);
    console.log("  > Lottery set up!", '\n');

    const TicketBeacon = await ethers.getContractAt("TicketBeacon", await LotteryManager.ticketBeacon());
    console.log(">> Ticket beacon deployed to:                           ", TicketBeacon.address);

    const TicketFactory = await ethers.getContractAt("TicketFactory", await LotteryManager.ticketFactory());
    console.log(">> Ticket factory deployed to:                          ", TicketFactory.address);
    console.log('\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
