
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const TempestSentinelABI = {
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "initialCoordination",
          "type": "address"
        },
        {
          "internalType": "uint16",
          "name": "initialThreshold",
          "type": "uint16"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AlreadyReviewed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidThreshold",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotAuditor",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotAuthorized",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "RecordNotFound",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousCoordination",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newCoordination",
          "type": "address"
        }
      ],
      "name": "CoordinationTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "PulseLinked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "submitter",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "eventType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "evidenceCID",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "locationHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "PulseLogged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "auditor",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "endorse",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reviewCID",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "updatedAt",
          "type": "uint256"
        }
      ],
      "name": "PulseReviewed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "groupCID",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "name": "StormChannelCreated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "auditors",
      "outputs": [
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "confidentialProtocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "newThreshold",
          "type": "uint16"
        }
      ],
      "name": "configureAuditThreshold",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "configureAuditor",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "coordination",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "groupCID",
          "type": "string"
        }
      ],
      "name": "createStormChannel",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "escalatePulse",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAuditThreshold",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getEncryptedAuditThreshold",
      "outputs": [
        {
          "internalType": "euint16",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "getPulse",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "submitter",
              "type": "address"
            },
            {
              "internalType": "uint8",
              "name": "eventType",
              "type": "uint8"
            },
            {
              "internalType": "string",
              "name": "evidenceCID",
              "type": "string"
            },
            {
              "internalType": "bytes32",
              "name": "sensorHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "locationHash",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "enum TempestSentinel.BeaconState",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint16",
              "name": "approveCount",
              "type": "uint16"
            },
            {
              "internalType": "uint16",
              "name": "rejectCount",
              "type": "uint16"
            },
            {
              "internalType": "euint32",
              "name": "encryptedIntensity",
              "type": "bytes32"
            },
            {
              "internalType": "euint64",
              "name": "encryptedPrecipitation",
              "type": "bytes32"
            },
            {
              "internalType": "ebool",
              "name": "encryptedHasMediaKey",
              "type": "bytes32"
            }
          ],
          "internalType": "struct TempestSentinel.PulseRecord",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        }
      ],
      "name": "getStormChannel",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "groupCID",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            }
          ],
          "internalType": "struct TempestSentinel.StormChannel",
          "name": "channel",
          "type": "tuple"
        },
        {
          "internalType": "uint256[]",
          "name": "recordIds",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "auditor",
          "type": "address"
        }
      ],
      "name": "hasReviewed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "linkPulseToChannel",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "eventType",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "locationHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "evidenceCID",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "sensorHash",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint32",
          "name": "encryptedIntensityExt",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "intensityProof",
          "type": "bytes"
        },
        {
          "internalType": "externalEuint64",
          "name": "encryptedPrecipitationExt",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "precipitationProof",
          "type": "bytes"
        },
        {
          "internalType": "externalEbool",
          "name": "encryptedHasMediaKeyExt",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "mediaProof",
          "type": "bytes"
        }
      ],
      "name": "logPulse",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextChannelId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextRecordId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "endorse",
          "type": "bool"
        },
        {
          "internalType": "string",
          "name": "reviewCID",
          "type": "string"
        }
      ],
      "name": "reviewPulse",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newCoordination",
          "type": "address"
        }
      ],
      "name": "transferCoordination",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;

