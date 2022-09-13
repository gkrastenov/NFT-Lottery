# NFT Lottery #

You have to create a NFT Lottery on a Hardhat environment( https://hardhat.org ).
Users should be able to buy a ticket which is an actual NFT. The funds from each ticket purchase are gathered in a prize pool. After a certain period of time a random winner should be chosen. We also want to be able to update our NFT tickets in the future.

### Contracts:
## Ticket
[x]* You should create NFT contract that represents a ticket. 
[x]    * A ticket should have simple metadata on-chain data.  
[x]       * **Bonus** * Additional data can be stored off-chain. 
[x]   * Users should be able to buy tickets. 
[x]   * Starting from a particular block people can buy tickets for limited time. 
[x]    * Funds from purchases should be stored in the contract. 
[x]        * Only the contract itself can use these funds. 
[x]    * After purchase time ends a random winner should be selected. You can complete simple random generation. 
[x]   * A function for a surprise winner should be created which will award the random generated winner with 50% of the gathered funds. 

## Proxy
[x] * A simple proxy contract should be created that should use the deployed ticket as its implementation. [x]

## Factory
[x] * The factory should be able to deploy proxies. 
[x]   * **Bonus** * The proxy deployment can be achieved using create2. []

### Environment
[x] * The written contracts should be deployed on a Hardhat environment.
[x] * A sample purchases should be acomplished.
[x] * For the purpose of the task a surprise winner should be selected before the time ends, collecting 50% of the gathered funds. At the end of the time another winner will collect all gathered funds left.
[x] * **Bonus** * Write simple tests verifying the deployment and the lottery winner.

The complicity of the contracts and testing is up to you.

### What can be used:

* Solidity
* JS
* Hardhat
* Ethers / Web3
* Any other library considered necessary

### Submissions

* Please upload your complete source code to a GitHub repo.
* How we will test your code:
    1.	`git clone`
    2.	`yarn`
    3.	`npx hardhat run scripts/lottery.js` OR `npx hardhat test` (if bonus task is done)