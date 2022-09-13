const { expect } = require("chai");
const { ethers } = require("hardhat");

let { GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH } = require('../utils/chainlink');

describe('LotteryManager', async function () {
    beforeEach(async function () {
        [deployer, newOwner, randomAccount] = await ethers.getSigners();
        this.LotteryManagerContract = await (await ethers.getContractFactory("LotteryManager"))
            .deploy();
        this.TicketImplementationAddress = (await (await ethers.getContractFactory("Ticket"))
            .deploy()).address;     
        this.WinnerPickerAddress = (await (await ethers.getContractFactory("WinnerPicker"))
            .deploy(GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH)).address;
    });

    describe("Deployment", async function () {
        it('should set deployer as owner', async function () {
            expect(await this.LotteryManagerContract.owner()).to.equal(deployer.address);
        });
    });

    describe("Initialization", async function () {
        it('should create the beacon contract passing it the ticket implementation', async function () {
            await this.LotteryManagerContract.initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress);
            expect(await this.LotteryManagerContract.ticketBeacon()).to.not.equal(ethers.constants.AddressZero);
        });

        it('should create the factory contract passing it the beacon address and the vrf consumer', async function () {
            await this.LotteryManagerContract.initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress);
            expect(await this.LotteryManagerContract.ticketFactory()).to.not.equal(ethers.constants.AddressZero);
        });

        it('should be access restricted to only owner', async function () {
            await expect(this.LotteryManagerContract.connect(randomAccount).initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    beforeEach(async function () {
        await this.LotteryManagerContract.initializeLottery(this.TicketImplementationAddress, this.WinnerPickerAddress);
    });

    describe("Implementation", async function () {
        beforeEach(async function () {
            this.newTicketImplementationAddress = (await (await ethers.getContractFactory("Ticket")).deploy()).address;
        });

        it('should pass the new implementation to the beacon', async function () {
            await this.LotteryManagerContract.changeImplementation(this.newTicketImplementationAddress);
            const ticketBeacon = await ethers.getContractAt('TicketBeacon', await this.LotteryManagerContract.ticketBeacon());
            expect(await ticketBeacon.implementation()).to.equal(this.newTicketImplementationAddress);
        });

        it('should be access restricted ot only owner', async function () {
            await expect(this.LotteryManagerContract.connect(randomAccount).changeImplementation(this.newTicketImplementationAddress))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        describe("Events", async function () {
            it('should emit event when the implementation is changed', async function () {
                expect(await this.LotteryManagerContract.changeImplementation(this.newTicketImplementationAddress))
                    .to.emit(this.LotteryManagerContract, "ChangedImplementation")
                    .withArgs(this.TicketImplementationAddress, this.newTicketImplementationAddress);
            });
    
            it('should emit event when lottery ownership is transferred', async function () {
                expect(await this.LotteryManagerContract.transferLotteryOwnership(newOwner.address))
                    .to.emit(this.LotteryManagerContract, "LotteryOwnershipTransferred")
                    .withArgs(deployer.address, newOwner.address);
            });
        });
    });

    describe("Ownership transfer", async function () {
        it('should trasnfer beacon ownership to new owner', async function () {
            await this.LotteryManagerContract.transferLotteryOwnership(newOwner.address);
            const ticketBeacon = await ethers.getContractAt('TicketBeacon', await this.LotteryManagerContract.ticketBeacon());
            expect(await ticketBeacon.owner()).to.equal(newOwner.address);
        });

        it('should trasnfer factory ownership to new owner', async function () {
            await this.LotteryManagerContract.transferLotteryOwnership(newOwner.address);
            const ticketFactory = await ethers.getContractAt('TicketFactory', await this.LotteryManagerContract.ticketFactory());
            expect(await ticketFactory.owner()).to.equal(newOwner.address);
        });
    });
});