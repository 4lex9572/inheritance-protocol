const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("InheritanceSwitch", function () {
    it("Should allow beneficiary to claim after inactivity", async function () {
        const [owner, beneficiary, feeCollector] = await ethers.getSigners();
        const Inheritance = await ethers.getContractFactory("InheritanceSwitch");
        const contract = await Inheritance.deploy(beneficiary.address, 60, feeCollector.address);
        await contract.deployed();
        await owner.sendTransaction({ to: contract.address, value: ethers.utils.parseEther("1") });
        await ethers.provider.send("evm_increaseTime", [61]);
        await ethers.provider.send("evm_mine");
        await contract.connect(beneficiary).claim();
        expect(await ethers.provider.getBalance(beneficiary.address)).to.gt(ethers.utils.parseEther("0.98"));
    });
});
