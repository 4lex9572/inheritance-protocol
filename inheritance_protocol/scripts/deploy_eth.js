const hre = require("hardhat");
async function main() {
    const beneficiary = process.env.BENEFICIARY_ADDRESS || "0x...";
    const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || "0x...";
    const inactivityPeriod = 6 * 30 * 24 * 60 * 60;
    const Inheritance = await hre.ethers.getContractFactory("InheritanceSwitch");
    const contract = await Inheritance.deploy(beneficiary, inactivityPeriod, feeCollector);
    await contract.deployed();
    console.log("Deployed to:", contract.address);
}
main().catch(console.error);
