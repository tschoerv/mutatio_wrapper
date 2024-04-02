// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // only included Ownable to set a primary ENS name

contract MUTATIO_wrapper is ERC20, IERC1155Receiver, ReentrancyGuard, Ownable{
    IERC1155 public immutable erc1155Contract;
    uint256 public immutable tokenID;

    uint256 private constant WRAP_RATIO = 1e18; // 1 ERC1155 = 1 * 10^18 ERC20

    constructor(
        address initialOwner,
        address _erc1155Address,
        uint256 _tokenID,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(initialOwner) {
        require(_erc1155Address != address(0), "Invalid ERC1155 address");
        erc1155Contract = IERC1155(_erc1155Address);
        tokenID = _tokenID;
    }

    function onERC1155Received(
        address,
        address from,
        uint256 id,
        uint256 amount,
        bytes calldata
    ) external override nonReentrant returns (bytes4) {
        require(msg.sender == address(erc1155Contract), "Unauthorized token");
        require(id == tokenID, "Token ID does not match");

        _mint(from, amount * WRAP_RATIO); // Adjust minting based on the WRAP_RATIO
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("Batch transfer not supported");     // In case VORTEX adds more tokens to this collection one day
    }

    function unwrap(uint256 erc20Amount) external nonReentrant {
        require(erc20Amount >= WRAP_RATIO, "Minimum unwrap amount is 1 ERC1155 token");
        uint256 erc1155Amount = erc20Amount / WRAP_RATIO; // Calculate the amount of ERC1155 tokens to unwrap
        uint256 remainderERC20Amount = erc20Amount % WRAP_RATIO; // Calculate the remainder of ERC20 tokens

        _burn(msg.sender, erc20Amount); // Burn the entire ERC20 amount requested for unwrap
        if (erc1155Amount > 0) {
            erc1155Contract.safeTransferFrom(
                address(this),
                msg.sender,
                tokenID,
                erc1155Amount,
                ""
            );
        }
        if (remainderERC20Amount > 0) {
            _mint(msg.sender, remainderERC20Amount); // Re-mint the remainder of ERC20 tokens back to the user
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}
