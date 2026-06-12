// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

contract InheritanceSwitch {
    address public owner;
    address public beneficiary;
    uint256 public lastHeartbeat;
    uint256 public inactivityPeriod;
    uint256 public constant FEE_BPS = 200;
    address public feeCollector;
    bool public isClaimed;

    event Heartbeat(address indexed owner, uint256 timestamp);
    event Claimed(address indexed beneficiary, uint256 amount, uint256 fee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notClaimed() {
        require(!isClaimed, "Already claimed");
        _;
    }

    constructor(address _beneficiary, uint256 _inactivityPeriodSeconds, address _feeCollector) payable {
        require(_beneficiary != address(0), "Beneficiary cannot be zero");
        require(_feeCollector != address(0), "Fee collector cannot be zero");
        owner = msg.sender;
        beneficiary = _beneficiary;
        inactivityPeriod = _inactivityPeriodSeconds;
        feeCollector = _feeCollector;
        lastHeartbeat = block.timestamp;
    }

    function heartbeat() external onlyOwner notClaimed {
        lastHeartbeat = block.timestamp;
        emit Heartbeat(owner, lastHeartbeat);
    }

    function claim() external notClaimed {
        require(block.timestamp >= lastHeartbeat + inactivityPeriod, "Still active");
        isClaimed = true;
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        uint256 fee = (balance * FEE_BPS) / 10000;
        uint256 toBeneficiary = balance - fee;

        (bool okBeneficiary, ) = beneficiary.call{value: toBeneficiary}("");
        require(okBeneficiary, "Beneficiary transfer failed");

        (bool okFee, ) = feeCollector.call{value: fee}("");
        require(okFee, "Fee transfer failed");

        emit Claimed(beneficiary, toBeneficiary, fee);
    }

    receive() external payable notClaimed {}
}
