const { expect } = require("chai");
const { ethers } = require("hardhat");

let { GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH } = require('../utils/chainlink');
let { NAME, SYMBOL, PRICE, getBlocks } = require("../utils/ticket");

describe('Access between contracts', async function () {
    beforeEach(async function () {
        [deployer, newOwner] = await ethers.getSigners();
        this.LotteryManager = await (await ethers.getContractFactory("LotteryManager")).deploy();

        this.TicketImplementationAddress = (await (await ethers.getContractFactory("Ticket")).deploy()).address;
        this.WinnerPickerAddress = (await (await ethers.getContractFactory("WinnerPicker"))
            .deploy(GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH)).address;

        await this.LotteryManager.initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress);

        this.TicketBeacon = await ethers.getContractAt("TicketBeacon", await this.LotteryManager.ticketBeacon());
        this.TicketFactory = await ethers.getContractAt("TicketFactory", await this.LotteryManager.ticketFactory());

        this.BLOCKS = await getBlocks();
        this.PARAMS = [NAME, SYMBOL, this.BLOCKS.START_BLOCK, this.BLOCKS.END_BLOCK, PRICE];

        await this.LotteryManager.deployTicketProxy(...this.PARAMS);
        this.TicketProxy = await ethers.getContractAt("TicketProxy", await this.TicketFactory.latestDeployedProxy());
    });

    it("Proxies implementation contract should be fetched from the beacon contract", async function () {
        expect(await this.TicketProxy.implementation()).to.equal(await this.TicketBeacon.implementation());
    });

    it("Lottery contract should be able to change the proxies implementation contract", async function () {
        const newImplementation = (await (await ethers.getContractFactory("Ticket")).deploy()).address;
        this.LotteryManager.changeImplementation(newImplementation);
        expect(await this.TicketProxy.implementation()).to.equal(newImplementation);
        expect(await this.TicketBeacon.implementation()).to.equal(newImplementation);
    });

    it("Factory and beacon contract should be owned by the lottery contract", async function () {
        expect(await this.TicketFactory.owner()).to.equal(this.LotteryManager.address);
        expect(await this.TicketBeacon.owner()).to.equal(this.LotteryManager.address);
    });

    it("Lottery contract should chane owner of factory and beacon contract", async function () {
        await this.LotteryManager.transferLotteryOwnership(newOwner.address);
        expect(await this.TicketFactory.owner()).to.equal(newOwner.address);
        expect(await this.TicketBeacon.owner()).to.equal(newOwner.address);
    });

});
