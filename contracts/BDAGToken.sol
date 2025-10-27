// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BDAGToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("BDAG Token", "BDAG") {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply * 10 ** decimals());
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10 ** decimals());
    }
}
