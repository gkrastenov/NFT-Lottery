const { expect } = require("chai");
const { ethers } = require("hardhat");

let { GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH } = require('../utils/chainlink');
let { NAME, SYMBOL, PRICE, getBlocks } = require("../utils/ticket");

describe('TicketFactory', async function () {
    beforeEach(async function () {
        [deployer, randomAccount] = await ethers.getSigners();
        this.TicketImplementationAddress = (await (await ethers.getContractFactory("Ticket"))
            .deploy()).address;
        this.TicketBeaconAddress = (await (await ethers.getContractFactory("TicketBeacon"))
            .deploy(this.TicketImplementationAddress)).address;
        this.WinnerPickerAddress = (await (await ethers.getContractFactory("WinnerPicker"))
            .deploy(GOERLI_VRF_COORDINATOR, GOERLI_LINK_TOKEN, GOERLI_KEYHASH)).address;
        this.TicketFactoryContract = await (await ethers.getContractFactory("TicketFactory"))
            .deploy(this.TicketBeaconAddress, this.WinnerPickerAddress);
    });

    describe("Deployment", async function () {
        it('should save the beacon address', async function () {
            expect(await this.TicketFactoryContract.BEACON_ADDRESS()).to.equal(this.TicketBeaconAddress);
        });

        it('should save the vrf consumer address', async function () {
            expect(await this.TicketFactoryContract.VRF_CONSUMER()).to.equal(this.WinnerPickerAddress);
        });
    });

    describe("Implementation", async function () {
        beforeEach(async function () {
            this.BLOCKS = await getBlocks();
            this.PARAMS = [NAME, SYMBOL, this.BLOCKS.START_BLOCK, this.BLOCKS.END_BLOCK, PRICE];
            this.salt = 1;
        });
        
        it('should be access restricted to only owner', async function () {
            await expect(this.TicketFactoryContract.deployTicketProxy(...this.PARAMS)).to.not.be.revertedWith("Ownable: caller is not the owner");
            await expect(this.TicketFactoryContract.connect(randomAccount).deployTicketProxy(...this.PARAMS)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('should be access restricted to only owner (deterministic)', async function () {
            await expect(this.TicketFactoryContract.deployTicketProxyDeterministic(...this.PARAMS, this.salt)).to.not.be.revertedWith("Ownable: caller is not the owner");
            await expect(this.TicketFactoryContract.connect(randomAccount).deployTicketProxyDeterministic(...this.PARAMS, this.salt)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('should get address of the latest deployed proxy', async function () {
            expect(await this.TicketFactoryContract.latestDeployedProxy()).to.equal(ethers.constants.AddressZero);
        });
        
        it('should get addresses of the latest deployed proxies', async function () {
            expect(await this.TicketFactoryContract.deployedProxies()).to.be.empty;
        });

        describe("Events", async function () {
            it('should emit event when new proxy is deployed', async function () {
                await expect(this.TicketFactoryContract.deployTicketProxy(...this.PARAMS))
                    .to.emit(this.TicketFactoryContract, "DeployedNewLottery");
            });
    
            it('should emit event when new proxy is deployed (deterministic)', async function () {
                await expect(this.TicketFactoryContract.deployTicketProxyDeterministic(...this.PARAMS, this.salt))
                    .to.emit(this.TicketFactoryContract, "DeployedNewLottery");
            });
        });
    });
});