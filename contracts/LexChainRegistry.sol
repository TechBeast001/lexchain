// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IKeyRegistry { function verifyKey(address user, string calldata keyHash) external view returns (bool); }

contract LexChainRegistry is AccessControl, Ownable {
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct Document { string hash; address uploader; string metadata; bool emergencyUnlocked; bool exists; }
    struct AccessRecord { address grantee; uint256 expiresAt; bool active; }

    IERC20 public token;
    IKeyRegistry public keyRegistry;

    uint256 public uploadFee;
    uint256 public grantFee;

    mapping(string => Document) public documents;
    mapping(string => mapping(address => AccessRecord)) public documentAccess;
    mapping(string => AccessRecord[]) public accessHistory;

    event DocumentUploaded(string indexed hash, address indexed uploader, string metadata);
    event AccessGranted(string indexed hash, address indexed grantee, uint256 expiresAt);
    event AccessRevoked(string indexed hash, address indexed grantee);
    event EmergencyActivated(string indexed hash, address indexed by);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event FeesUpdated(uint256 uploadFee, uint256 grantFee);

    constructor(address tokenAddr, address keyRegistryAddr, uint256 _uploadFee, uint256 _grantFee) {
        token = IERC20(tokenAddr);
        keyRegistry = IKeyRegistry(keyRegistryAddr);
        uploadFee = _uploadFee;
        grantFee = _grantFee;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function uploadDocument(string calldata hash, string calldata metadata) external {
        require(!documents[hash].exists, "already exists");
        require(token.transferFrom(msg.sender, address(this), uploadFee), "fee fail");
        documents[hash] = Document(hash, msg.sender, metadata, false, true);
        emit DocumentUploaded(hash, msg.sender, metadata);
    }

    function grantAccess(string calldata hash, address grantee, uint256 durationSec) external {
        Document storage doc = documents[hash];
        require(doc.exists, "not found");
        require(doc.uploader == msg.sender, "not owner");
        require(token.transferFrom(msg.sender, address(this), grantFee), "fee fail");

        uint256 expiresAt = block.timestamp + durationSec;
        documentAccess[hash][grantee] = AccessRecord(grantee, expiresAt, true);
        accessHistory[hash].push(AccessRecord(grantee, expiresAt, true));
        emit AccessGranted(hash, grantee, expiresAt);
    }

    function revokeAccess(string calldata hash, address grantee) external {
        Document storage doc = documents[hash];
        require(doc.exists, "not found");
        require(doc.uploader == msg.sender, "not owner");
        documentAccess[hash][grantee].active = false;
        accessHistory[hash].push(AccessRecord(grantee, block.timestamp, false));
        emit AccessRevoked(hash, grantee);
    }

    function activateEmergency(string calldata hash, string calldata keyHash) external onlyRole(EMERGENCY_ROLE) {
        Document storage doc = documents[hash];
        require(doc.exists, "not found");
        require(keyRegistry.verifyKey(msg.sender, keyHash), "invalid key");
        require(!doc.emergencyUnlocked, "already unlocked");
        doc.emergencyUnlocked = true;
        emit EmergencyActivated(hash, msg.sender);
    }

    function hasAccess(address user, string calldata hash) external view returns (bool) {
        Document memory doc = documents[hash];
        if (!doc.exists) return false;
        AccessRecord memory rec = documentAccess[hash][user];
        bool validGrant = rec.active && rec.expiresAt >= block.timestamp;
        return (doc.uploader == user || validGrant || doc.emergencyUnlocked);
    }
}
