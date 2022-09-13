const { expect } = require("chai");
const { ethers } = require("hardhat");

let { NAME, SYMBOL, PRICE, getBlocks } = require("../utils/ticket");
let { mineBlocks } = require("../utils/miningBlocks");
const { deployMockedLink, deployMockedWinnerPicker } = require("../utils/mocking");

describe('Ticket', async function () {
    beforeEach(async function () {
        [deployer, player2, player3] = await ethers.getSigners();
        this.Ticket = await (await ethers.getContractFactory("Ticket")).deploy();

        this.LINK_TOKEN_MOCK = await deployMockedLink();
        this.WINNER_PICKER_MOCK = await deployMockedWinnerPicker();

        await Promise.all([
            this.WINNER_PICKER_MOCK.mock.LINK_TOKEN.returns(this.LINK_TOKEN_MOCK.address),
            this.WINNER_PICKER_MOCK.mock.fee.returns(ethers.utils.parseEther("0.05")),
            this.WINNER_PICKER_MOCK.mock.getRandomNumber.returns("0x" + Array(65).join('0')),
            this.LINK_TOKEN_MOCK.mock.transferFrom.withArgs(deployer.address, this.WINNER_PICKER_MOCK.address, ethers.utils.parseEther("0.05")).returns(true)
        ]);

        this.BLOCKS = await getBlocks();
        this.PARAMS = [NAME, SYMBOL, this.BLOCKS.START_BLOCK, this.BLOCKS.END_BLOCK, PRICE, this.WINNER_PICKER_MOCK.address];
    });

    describe("Initialization", async function () {
        describe('Contract initialziation', async function () {
            beforeEach(async function () {
                await this.Ticket.initialize(...this.PARAMS);
            });

            it('should set correct name', async function () {
                expect(await this.Ticket.name()).to.equal(NAME);
            });

            it('should set correct symbol', async function () {
                expect(await this.Ticket.symbol()).to.equal(SYMBOL);
            });

            it('should set correct start block', async function () {
                expect(await this.Ticket.START_BLOCK_NUMBER()).to.equal(this.BLOCKS.START_BLOCK);
            });

            it('should set correct end block', async function () {
                expect(await this.Ticket.END_BLOCK_NUMBER()).to.equal(this.BLOCKS.END_BLOCK);
            });

            it('should set correct price', async function () {
                expect(await this.Ticket.TICKET_PRICE()).to.equal(PRICE);
            });

            it('should set correct winner picker / vrf consumer', async function () {
                expect(await this.Ticket.WINNER_PICKER()).to.equal(this.WINNER_PICKER_MOCK.address);
            });
        });

        describe('Validation', async function () {
            afterEach(async function () {
                await expect(this.Ticket.initialize(...this.PARAMS)).to.be.revertedWith("InvalidInput()");
            });

            it('should throw if name is empty string', async function () {
                this.PARAMS[0] = "";
            });

            it('should throw if symbol is empty string', async function () {
                this.PARAMS[1] = "";
            });

            it('should throw if starting block less than current one', async function () {
                this.PARAMS[2] = this.BLOCKS.CURRENT_BLOCK - 1;
            });

            it('should throw if ending block less than or equal to the starting one', async function () {
                this.PARAMS[3] = this.BLOCKS.START_BLOCK - 1;
            });

            it('should throw if ticket is free', async function () {
                this.PARAMS[4] = 0;
            });

            it('should throw if winner picker is zero address', async function () {
                this.PARAMS[5] = ethers.constants.AddressZero
            });
        });

        describe("Double initialize", async function () {
            it("should not be able to initialize a second time", async function () {
                await this.Ticket.initialize(...this.PARAMS);
                await expect(this.Ticket.initialize(...this.PARAMS))
                    .to.be.revertedWith("Initializable: contract is already initialized");
            });
        });
    });

    describe("Ticket purchasing", async function () {
        describe("Restrictions", async function () {
            it("should not be allowed before starting block", async function () {
                await this.Ticket.initialize(...this.PARAMS);
                await expect(this.Ticket.buyTicket({ value: PRICE })).to.be.revertedWith("Unavailable()");
                await expect(this.Ticket.buyTicketWithURI("URI", { value: PRICE })).to.be.revertedWith("Unavailable()");
            });

            it("should not be allowed after end block", async function () {
                const blocksUntilEnd = this.BLOCKS.END_BLOCK - this.BLOCKS.CURRENT_BLOCK;
                await this.Ticket.initialize(...this.PARAMS);
                await mineBlocks(blocksUntilEnd);
                await expect(this.Ticket.buyTicket({ value: PRICE })).to.be.revertedWith("Unavailable()");
                await expect(this.Ticket.buyTicketWithURI("URI", { value: PRICE })).to.be.revertedWith("Unavailable()");
            });

            it("should check if sending ether amount is equal to the ticket price", async function () {
                this.PARAMS[2] = this.BLOCKS.CURRENT_BLOCK + 1;
                await this.Ticket.initialize(...this.PARAMS);
                await expect(this.Ticket.buyTicket({ value: 1 })).to.be.revertedWith("InvalidAmount()");
                await expect(this.Ticket.buyTicket({ value: PRICE })).to.not.be.revertedWith("InvalidAmount()");
            });

            it("should check if sending ether amount is equal to the ticket price (URI function)", async function () {
                this.PARAMS[2] = this.BLOCKS.CURRENT_BLOCK + 1;
                await this.Ticket.initialize(...this.PARAMS);
                await expect(this.Ticket.buyTicketWithURI("URI", { value: 1 })).to.be.revertedWith("InvalidAmount()");
                await expect(this.Ticket.buyTicketWithURI("URI", { value: PRICE })).to.not.be.revertedWith("InvalidAmount()");
            });
        });

        describe("Minting tickets", async function () {
            beforeEach(async function () {
                this.PARAMS[2] = this.BLOCKS.CURRENT_BLOCK + 2;
                await this.Ticket.initialize(...this.PARAMS);
                this.id = (await this.Ticket.id()).toNumber();
            });

            it("should mint a new token to the user with the current id", async function () {
                await this.Ticket.buyTicket({ value: PRICE });
                expect(await this.Ticket.ownerOf(this.id)).to.equal(deployer.address);
            });

            it("should mint a new token to the user with the current id (URI function)", async function () {
                await this.Ticket.buyTicketWithURI("URI", { value: PRICE });
                expect(await this.Ticket.ownerOf(this.id)).to.equal(deployer.address);
            });

            it("should set token URI", async function () {
                await this.Ticket.buyTicketWithURI("URI", { value: PRICE });
                expect(await this.Ticket.tokenURI(this.id)).to.equal("URI");
            });

            it("should increment id counter", async function () {
                await this.Ticket.buyTicket({ value: PRICE });
                expect((await this.Ticket.id()).toNumber()).to.be.greaterThan(this.id);
            });

            it("should increment id counter (URI)", async function () {
                await this.Ticket.buyTicketWithURI("URI", { value: PRICE });
                expect((await this.Ticket.id()).toNumber()).to.be.greaterThan(this.id);
            });
        });
    });

    describe("Picking random winner", async function () {
        beforeEach(async function () {
            await this.Ticket.initialize(...this.PARAMS);

            /// START_BLOCK_NUMBER + (END_BLOCK_NUMBER - START_BLOCK_NUMBER) / 4
            this.surpriseBlockNumber = this.BLOCKS.START_BLOCK - this.BLOCKS.CURRENT_BLOCK + (this.BLOCKS.END_BLOCK - this.BLOCKS.START_BLOCK) / 4
        });

        describe("Block validations", async function () {
            it("should not be able to pick the surpise winner before to be able", async function () {
                await mineBlocks(this.surpriseBlockNumber / 2);
                await expect(this.Ticket.pickRandomWinner()).to.be.revertedWith("Unavailable()");
            });

            it("should be able to pick the surprise winner before end", async function () {
                await mineBlocks(this.surpriseBlockNumber);
                await expect(this.Ticket.pickRandomWinner()).to.not.be.revertedWith("Unavailable()");
            });

            it("should be able to pick the winner after end", async function () {
                await mineBlocks(this.BLOCKS.END_BLOCK - this.BLOCKS.CURRENT_BLOCK);
                await expect(this.Ticket.pickRandomWinner()).to.not.be.revertedWith("Unavailable()");
            });
        });

        describe("WinnerPicker contract interaction", async function () {
            it("should transfer LINK tokens from the msg.sender balance to the VRFConsumer contract", async function () {
                await mineBlocks(this.surpriseBlockNumber);
                await expect(this.Ticket.pickRandomWinner()).to.not.be.reverted;
            });

            it("should request a random number", async function () {
                const surpriseWinnerSignature = "chooseSurpriseWinner(uint256)";
                const winnerSignature = "chooseWinner(uint256)";
                await this.WINNER_PICKER_MOCK.mock.getRandomNumber.withArgs(surpriseWinnerSignature).revertsWithReason(surpriseWinnerSignature);
                await this.WINNER_PICKER_MOCK.mock.getRandomNumber.withArgs(winnerSignature).revertsWithReason(winnerSignature);

                await mineBlocks(this.surpriseBlockNumber);
                await expect(this.Ticket.pickRandomWinner()).to.be.revertedWith(surpriseWinnerSignature);

                await mineBlocks(this.surpriseBlockNumber);
                await expect(this.Ticket.pickRandomWinner()).to.be.revertedWith(winnerSignature);
            });

            it("should save boolean that we have been choosen a winner", async function () {
                await mineBlocks(this.surpriseBlockNumber);
                await this.Ticket.pickRandomWinner();
                expect(await this.Ticket.choosenSurpriseWinner()).to.be.true;

                await mineBlocks(this.surpriseBlockNumber + 1);
                await this.Ticket.pickRandomWinner();
                expect(await this.Ticket.choosenWinner()).to.be.true;
            });
        });
    });

    describe("Choosing winners", async function () {
        beforeEach(async function () {
            this.PARAMS[5] = deployer.address;
            await this.Ticket.initialize(...this.PARAMS);
            await mineBlocks(this.BLOCKS.START_BLOCK - this.BLOCKS.CURRENT_BLOCK);
            await this.Ticket.buyTicket({ value: PRICE });
            await this.Ticket.buyTicket({ value: PRICE }); 
            this.randomness = 3;
        });

        describe("Saving surprise winner", async function () {
            it("should save winning ticket id", async function () {
                await this.Ticket.chooseSurpriseWinner(this.randomness);
                expect(await this.Ticket.surpriseWinnerTicketId()).to.equal(1);
            });

            it("should save reward amount equal to half of current balance", async function () {
                await this.Ticket.chooseSurpriseWinner(this.randomness);
                expect(await this.Ticket.surpriseWinnerRewardAmount()).to.equal(0.5 * Number(await ethers.provider.getBalance(this.Ticket.address)));
            });

            it("should emit an event", async function () {
                await expect(this.Ticket.chooseSurpriseWinner(this.randomness)).to.emit(this.Ticket, "SurpriseWinnerChoosen").withArgs(deployer.address, 1);
            });
        });

        describe("Saving winner", async function () {
            beforeEach(async function () {
                await mineBlocks(this.BLOCKS.END_BLOCK - this.BLOCKS.START_BLOCK + 1000);
            });

            it("should save winning ticket id", async function () {
                await this.Ticket.chooseWinner(this.randomness);
                expect(await this.Ticket.winnerTicketId()).to.equal(1); // 3 % 2 = 1
            });

            it("should emit an event", async function () {
                await this.Ticket.chooseWinner(this.randomness);
                await expect(this.Ticket.chooseWinner(this.randomness)).to.emit(this.Ticket, "WinnerChoosen").withArgs(deployer.address, 1);
            });
        });
    });

    describe("Access", async function () {
        beforeEach(async function () {
            await this.Ticket.initialize(...this.PARAMS);
        });

        // started function
        it("should return false if not started yet", async function () {
            expect(await this.Ticket.started()).to.be.false;
        });

        it("should return true if started", async function () {
            await mineBlocks(this.BLOCKS.START_BLOCK - this.BLOCKS.CURRENT_BLOCK);
            expect(await this.Ticket.started()).to.be.true;
        });

        // finished function
        it("should return false if not finished yet", async function () {
            expect(await this.Ticket.finished()).to.be.false;
        });

        it("should return true if finished", async function () {
            await mineBlocks(this.BLOCKS.END_BLOCK - this.BLOCKS.CURRENT_BLOCK);
            expect(await this.Ticket.finished()).to.be.true;
        });
    });
});