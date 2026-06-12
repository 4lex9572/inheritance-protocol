require("@nomicfoundation/hardhat-toolbox");
module.exports = { solidity: "0.8.19", networks: { sepolia: { url: process.env.ETH_RPC, accounts: [process.env.ETH_PRIVATE_KEY] } } };
