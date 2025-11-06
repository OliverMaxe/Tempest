// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint16, euint32, euint64, externalEbool, externalEuint16, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title TempestSentinel
 * @notice Fully homomorphic encryption powered registry for encrypted extreme-weather intelligence.
 * @dev Pulse submissions keep sensor metrics encrypted on-chain. Audit thresholds are evaluated over
 *      encrypted counters to preserve privacy of aggregated validation stats.
 */
contract TempestSentinel is ZamaEthereumConfig {
    enum BeaconState {
        Pending,
        Verified,
        Rejected,
        Contested
    }

    struct PulseRecord {
        address submitter;
        uint8 eventType;
        string evidenceCID;
        bytes32 sensorHash;
        bytes32 locationHash;
        uint256 timestamp;
        BeaconState status;
        uint16 approveCount;
        uint16 rejectCount;
        euint32 encryptedIntensity; // intensity score 0-10_000 (allows decimals *1000)
        euint64 encryptedPrecipitation; // rainfall mm * 100
        ebool encryptedHasMediaKey; // indicates encrypted media is provided
    }

    struct StormChannel {
        address creator;
        string groupCID;
        uint256 createdAt;
    }

    struct AuditorInfo {
        bool enabled;
    }

    mapping(uint256 => PulseRecord) private _records;
    mapping(uint256 => StormChannel) private _channels;
    mapping(uint256 => uint256[]) private _channelRecords;

    mapping(uint256 => mapping(address => bool)) private _hasReviewed;
    mapping(address => AuditorInfo) public auditors;

    uint256 public nextRecordId = 1;
    uint256 public nextChannelId = 1;
    euint16 private _encryptedAuditThreshold;
    uint16 private _auditThreshold;

    address public coordination; // multi-sig or admin

    event PulseLogged(
        uint256 indexed recordId,
        address indexed submitter,
        uint8 indexed eventType,
        string evidenceCID,
        bytes32 locationHash,
        uint256 timestamp
    );

    event PulseReviewed(
        uint256 indexed recordId,
        address indexed auditor,
        bool endorse,
        string reviewCID,
        uint256 updatedAt
    );

    event StormChannelCreated(uint256 indexed channelId, address indexed creator, string groupCID, uint256 createdAt);

    event PulseLinked(uint256 indexed channelId, uint256 indexed recordId);

    event CoordinationTransferred(address indexed previousCoordination, address indexed newCoordination);

    error NotAuthorized();
    error RecordNotFound();
    error AlreadyReviewed();
    error NotAuditor();
    error InvalidThreshold();

    modifier onlyCoordination() {
        if (msg.sender != coordination) revert NotAuthorized();
        _;
    }

    modifier onlyExistingRecord(uint256 recordId) {
        if (_records[recordId].submitter == address(0)) revert RecordNotFound();
        _;
    }

    constructor(address initialCoordination, uint16 initialThreshold) {
        coordination = initialCoordination;
        _setEncryptedAuditThreshold(initialThreshold);
    }

    // ----------------
    // Governance
    // ----------------

    function transferCoordination(address newCoordination) external onlyCoordination {
        address previous = coordination;
        coordination = newCoordination;
        emit CoordinationTransferred(previous, newCoordination);
    }

    function configureAuditor(address account, bool enabled) external onlyCoordination {
        auditors[account].enabled = enabled;
    }

    function configureAuditThreshold(uint16 newThreshold) external onlyCoordination {
        _setEncryptedAuditThreshold(newThreshold);
    }

    function _setEncryptedAuditThreshold(uint16 newThreshold) internal {
        if (newThreshold == 0) revert InvalidThreshold();
        euint16 encrypted = FHE.asEuint16(newThreshold);
        _encryptedAuditThreshold = encrypted;
        _auditThreshold = newThreshold;
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, address(0)); // allow view operations
    }

    // ----------------
    // Pulse lifecycle
    // ----------------

    function logPulse(
        uint8 eventType,
        bytes32 locationHash,
        string calldata evidenceCID,
        bytes32 sensorHash,
        externalEuint32 encryptedIntensityExt,
        bytes calldata intensityProof,
        externalEuint64 encryptedPrecipitationExt,
        bytes calldata precipitationProof,
        externalEbool encryptedHasMediaKeyExt,
        bytes calldata mediaProof
    ) external returns (uint256 recordId) {
        euint32 intensity = FHE.fromExternal(encryptedIntensityExt, intensityProof);
        euint64 precipitation = FHE.fromExternal(encryptedPrecipitationExt, precipitationProof);
        ebool hasMediaKey = FHE.fromExternal(encryptedHasMediaKeyExt, mediaProof);

        recordId = nextRecordId++;

        PulseRecord storage record = _records[recordId];
        record.submitter = msg.sender;
        record.eventType = eventType;
        record.evidenceCID = evidenceCID;
        record.sensorHash = sensorHash;
        record.locationHash = locationHash;
        record.timestamp = block.timestamp;
        record.status = BeaconState.Pending;
        record.approveCount = 0;
        record.rejectCount = 0;
        record.encryptedIntensity = intensity;
        record.encryptedPrecipitation = precipitation;
        record.encryptedHasMediaKey = hasMediaKey;

        // allow coordination hub (for dispute) and submitter to decrypt
        FHE.allowThis(intensity);
        FHE.allowThis(precipitation);
        FHE.allowThis(hasMediaKey);
        FHE.allow(intensity, msg.sender);
        FHE.allow(precipitation, msg.sender);
        FHE.allow(hasMediaKey, msg.sender);
        if (coordination != address(0)) {
            FHE.allow(intensity, coordination);
            FHE.allow(precipitation, coordination);
            FHE.allow(hasMediaKey, coordination);
        }

        emit PulseLogged(recordId, msg.sender, eventType, evidenceCID, locationHash, block.timestamp);
    }

    function reviewPulse(
        uint256 recordId,
        bool endorse,
        string calldata reviewCID
    ) external onlyExistingRecord(recordId) {
        if (!auditors[msg.sender].enabled) revert NotAuditor();
        if (_hasReviewed[recordId][msg.sender]) revert AlreadyReviewed();

        PulseRecord storage record = _records[recordId];

        _hasReviewed[recordId][msg.sender] = true;

        if (endorse) {
            record.approveCount += 1;
        } else {
            record.rejectCount += 1;
        }

        _refreshState(record);

        emit PulseReviewed(recordId, msg.sender, endorse, reviewCID, block.timestamp);
    }

    function _refreshState(PulseRecord storage record) internal {
        if (record.approveCount >= _auditThreshold) {
            record.status = BeaconState.Verified;
        } else if (record.rejectCount > 0 && record.status != BeaconState.Verified) {
            record.status = BeaconState.Contested;
        }
    }

    function escalatePulse(uint256 recordId) external onlyExistingRecord(recordId) {
        PulseRecord storage record = _records[recordId];
        if (msg.sender != record.submitter && msg.sender != coordination) revert NotAuthorized();
        record.status = BeaconState.Contested;
    }

    function createStormChannel(string calldata groupCID) external returns (uint256 channelId) {
        channelId = nextChannelId++;
        _channels[channelId] = StormChannel({
            creator: msg.sender,
            groupCID: groupCID,
            createdAt: block.timestamp
        });
        emit StormChannelCreated(channelId, msg.sender, groupCID, block.timestamp);
    }

    function linkPulseToChannel(uint256 channelId, uint256 recordId) external {
        StormChannel storage channel = _channels[channelId];
        if (channel.creator == address(0)) revert NotAuthorized();
        if (msg.sender != channel.creator && msg.sender != coordination) revert NotAuthorized();
        if (_records[recordId].submitter == address(0)) revert RecordNotFound();
        _channelRecords[channelId].push(recordId);
        emit PulseLinked(channelId, recordId);
    }

    function getPulse(uint256 recordId) external view returns (PulseRecord memory) {
        PulseRecord memory record = _records[recordId];
        if (record.submitter == address(0)) revert RecordNotFound();
        return record;
    }

    function getStormChannel(uint256 channelId)
        external
        view
        returns (StormChannel memory channel, uint256[] memory recordIds)
    {
        channel = _channels[channelId];
        recordIds = _channelRecords[channelId];
    }

    function hasReviewed(uint256 recordId, address auditor) external view returns (bool) {
        return _hasReviewed[recordId][auditor];
    }

    function getEncryptedAuditThreshold() external view returns (euint16) {
        return _encryptedAuditThreshold;
    }

    function getAuditThreshold() external view returns (uint16) {
        return _auditThreshold;
    }
}


