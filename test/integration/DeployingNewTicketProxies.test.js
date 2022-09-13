const { expect } = require("chai");
const { ethers } = require("hardhat");

let { GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH } = require('../utils/chainlink');
let { NAME, SYMBOL, PRICE, getBlocks } = require("../utils/ticket");

describe('Deployment of new proxies', async function () {
    beforeEach(async function () {
        [deployer] = await ethers.getSigners();
        this.LotteryManager = await (await ethers.getContractFactory("LotteryManager")).deploy();

        this.TicketImplementationAddress = (await (await ethers.getContractFactory("Ticket")).deploy()).address;
        this.WinnerPickerAddress = (await (await ethers.getContractFactory("WinnerPicker"))
            .deploy(GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH)).address;

        await this.LotteryManager.initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress);

        this.TicketFactory = await ethers.getContractAt("TicketFactory", await this.LotteryManager.ticketFactory());

        this.BLOCKS = await getBlocks();
        this.PARAMS = [NAME, SYMBOL, this.BLOCKS.START_BLOCK, this.BLOCKS.END_BLOCK, PRICE];
    });

    it("Lottery should be able to deploy new ticket proxies", async function () {
        await this.LotteryManager.deployTicketProxy(...this.PARAMS);
        expect(await this.TicketFactory.latestDeployedProxy()).to.not.equal(ethers.constants.AddressZero);
    });

    it("Lottery should not be able to deploy new ticket proxies if it is not finished", async function () {
        await this.LotteryManager.deployTicketProxy(...this.PARAMS);
        await expect(this.LotteryManager.deployTicketProxy(...this.PARAMS)).to.be.revertedWith("AlreadyActiveTicketImplementation()");
    });
});
