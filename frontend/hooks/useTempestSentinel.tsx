import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ethers } from "ethers";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { TempestSentinelABI } from "@/abi/TempestSentinelABI";
import { TempestSentinelAddresses } from "@/abi/TempestSentinelAddresses";

export type PulseStatus = "Pending" | "Verified" | "Rejected" | "Contested";

export type PulseEntry = {
  id: bigint;
  submitter: string;
  eventType: number;
  evidenceCID: string;
  sensorHash: string;
  locationHash: string;
  timestamp: number;
  status: PulseStatus;
  approveCount: number;
  rejectCount: number;
  encryptedIntensity: string;
  encryptedPrecipitation: string;
  encryptedHasMediaKey: string;
  decrypted?: {
    intensityScore?: bigint;
    precipitationMm?: bigint;
    hasMediaKey?: boolean;
  };
};

export type StormChannel = {
  id: bigint;
  creator: string;
  groupCID: string;
  createdAt: number;
  recordIds: bigint[];
};

type LogPayload = {
  eventType: number;
  locationHash: string;
  evidenceCID: string;
  sensorHash: string;
  intensityScore: bigint;
  precipitationMm: bigint;
  hasEncryptedMediaKey: boolean;
};

type ReviewPayload = {
  recordId: bigint;
  endorse: boolean;
  reviewCID: string;
};

type UseTempestSentinelParams = {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(signer: ethers.JsonRpcSigner | undefined) => boolean>;
};

type InternalState = {
  pulseList: PulseEntry[];
  channels: StormChannel[];
  isLoading: boolean;
  isLogging: boolean;
  isReviewing: boolean;
  error?: string;
};

type DecryptedCacheRecord = {
  intensity: number;
  precipitation: number;
  hasMediaKey: boolean;
};

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

export function useTempestSentinel({
  instance,
  fhevmDecryptionSignatureStorage,
  chainId,
  ethersSigner,
  ethersReadonlyProvider,
  sameChain,
  sameSigner,
}: UseTempestSentinelParams) {
  const [state, setState] = useState<InternalState>({
    pulseList: [],
    channels: [],
    isLoading: false,
    isLogging: false,
    isReviewing: false,
  });
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, DecryptedCacheRecord>>({});

  const refreshingRef = useRef(false);
  const decryptingRef = useRef(false);

  const networkConfig = useMemo(() => {
    if (!chainId) return undefined;
    return TempestSentinelAddresses[chainId.toString() as keyof typeof TempestSentinelAddresses];
  }, [chainId]);

  const contract = useMemo(() => {
    if (!ethersReadonlyProvider || !networkConfig?.address || networkConfig.address === ethers.ZeroAddress) {
      return undefined;
    }
    return new ethers.Contract(networkConfig.address, TempestSentinelABI.abi, ethersReadonlyProvider);
  }, [networkConfig?.address, ethersReadonlyProvider]);

  const contractWithSigner = useMemo(() => {
    if (!ethersSigner || !networkConfig?.address || networkConfig.address === ethers.ZeroAddress) {
      return undefined;
    }
    return new ethers.Contract(networkConfig.address, TempestSentinelABI.abi, ethersSigner);
  }, [networkConfig?.address, ethersSigner]);

  const refreshPulses = useCallback(async () => {
    if (!contract || refreshingRef.current) return;

    refreshingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const nextId: bigint = await contract.nextRecordId();
      const records: PulseEntry[] = [];

      for (let i = BigInt(1); i < nextId; i = i + BigInt(1)) {
        const pulse = await contract.getPulse(i);
        const status = resolveStatus(Number(pulse.status));
        records.push({
          id: i,
          submitter: pulse.submitter,
          eventType: Number(pulse.eventType),
          evidenceCID: pulse.evidenceCID,
          sensorHash: pulse.sensorHash,
          locationHash: pulse.locationHash,
          timestamp: Number(pulse.timestamp),
          status,
          approveCount: Number(pulse.approveCount),
          rejectCount: Number(pulse.rejectCount),
          encryptedIntensity: pulse.encryptedIntensity,
          encryptedPrecipitation: pulse.encryptedPrecipitation,
          encryptedHasMediaKey: pulse.encryptedHasMediaKey,
        });
      }

      const nextChannel: bigint = await contract.nextChannelId();
      const channelList: StormChannel[] = [];
      for (let c = BigInt(1); c < nextChannel; c = c + BigInt(1)) {
        const [channel, recordIds] = await contract.getStormChannel(c);
        if (channel.creator === ethers.ZeroAddress) continue;
        channelList.push({
          id: c,
          creator: channel.creator,
          groupCID: channel.groupCID,
          createdAt: Number(channel.createdAt),
          recordIds: recordIds.map((r: bigint) => r),
        });
      }

      setState((prev) => ({
        ...prev,
        pulseList: records,
        channels: channelList,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (error as Error)?.message ?? "无法刷新脉冲列表",
      }));
    } finally {
      refreshingRef.current = false;
    }
  }, [contract]);

  const decryptPulses = useCallback(
    async (recordIds: bigint[]) => {
      if (!instance || !ethersSigner || !networkConfig?.address || decryptingRef.current) return;
      if (!sameChain.current?.(chainId) || !sameSigner.current?.(ethersSigner)) return;

      decryptingRef.current = true;
      setState((prev) => ({ ...prev, error: undefined }));

      try {
        const handles = state.pulseList
          .filter((record) => recordIds.includes(record.id))
          .flatMap((record) => [
            { handle: record.encryptedIntensity, contractAddress: networkConfig.address as `0x${string}` },
            { handle: record.encryptedPrecipitation, contractAddress: networkConfig.address as `0x${string}` },
            { handle: record.encryptedHasMediaKey, contractAddress: networkConfig.address as `0x${string}` },
          ]);

        if (handles.length === 0) {
          decryptingRef.current = false;
          return;
        }

        const signature = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [networkConfig.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!signature) {
          setState((prev) => ({
            ...prev,
            error: "无法生成或加载解密签名",
          }));
          decryptingRef.current = false;
          return;
        }

        const result = await instance.userDecrypt(
          handles,
          signature.privateKey,
          signature.publicKey,
          signature.signature,
          signature.contractAddresses,
          signature.userAddress,
          signature.startTimestamp,
          signature.durationDays
        );

        setDecryptedCache((prev) => {
          const next = { ...prev };
          for (const id of recordIds) {
            const record = state.pulseList.find((p) => p.id === id);
            if (!record) continue;
            const values = result as unknown as Record<string, unknown>;
            const intensityRaw = toBigInt(values[record.encryptedIntensity]);
            const precipitationRaw = toBigInt(values[record.encryptedPrecipitation]);
            const hasMediaRaw = toBigInt(values[record.encryptedHasMediaKey]);
            next[id.toString()] = {
              intensity: Number(intensityRaw) / 1000,
              precipitation: Number(precipitationRaw) / 100,
              hasMediaKey: hasMediaRaw !== BigInt(0),
            };
          }
          return next;
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: (error as Error)?.message ?? "解密失败",
        }));
      } finally {
        decryptingRef.current = false;
      }
    },
    [
      chainId,
      instance,
      networkConfig?.address,
      sameChain,
      sameSigner,
      ethersSigner,
      state.pulseList,
      fhevmDecryptionSignatureStorage,
    ]
  );

  const logPulse = useCallback(
    async (payload: LogPayload) => {
      if (!instance || !contractWithSigner || !ethersSigner || !networkConfig?.address) {
        setState((prev) => ({
          ...prev,
          error: "链或钱包未准备好",
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLogging: true, error: undefined }));

      try {
        const intensityInput = instance.createEncryptedInput(
          networkConfig.address as `0x${string}`,
          ethersSigner.address as `0x${string}`
        );
        intensityInput.add32(payload.intensityScore);
        const intensityEnc = await intensityInput.encrypt();

        const precipitationInput = instance.createEncryptedInput(
          networkConfig.address as `0x${string}`,
          ethersSigner.address as `0x${string}`
        );
        precipitationInput.add64(payload.precipitationMm);
        const precipitationEnc = await precipitationInput.encrypt();

        const mediaInput = instance.createEncryptedInput(
          networkConfig.address as `0x${string}`,
          ethersSigner.address as `0x${string}`
        );
        mediaInput.addBool(payload.hasEncryptedMediaKey);
        const mediaEnc = await mediaInput.encrypt();

        const tx = await contractWithSigner.logPulse(
          payload.eventType,
          payload.locationHash,
          payload.evidenceCID,
          payload.sensorHash,
          intensityEnc.handles[0],
          intensityEnc.inputProof,
          precipitationEnc.handles[0],
          precipitationEnc.inputProof,
          mediaEnc.handles[0],
          mediaEnc.inputProof
        );
        const receipt = await tx.wait();
        if (!receipt?.status) {
          throw new Error("交易未成功");
        }

        setMessage("脉冲提交成功，等待 Tempest Sentinel 审阅网络处理。");
        await refreshPulses();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: (error as Error)?.message ?? "提交脉冲失败",
        }));
      } finally {
        setState((prev) => ({ ...prev, isLogging: false }));
      }
    },
    [contractWithSigner, instance, networkConfig?.address, refreshPulses, ethersSigner]
  );

  const reviewPulse = useCallback(
    async ({ recordId, endorse, reviewCID }: ReviewPayload) => {
      if (!contractWithSigner) {
        setState((prev) => ({ ...prev, error: "缺少签名钱包" }));
        return;
      }

      setState((prev) => ({ ...prev, isReviewing: true, error: undefined }));

      try {
        const tx = await contractWithSigner.reviewPulse(recordId, endorse, reviewCID);
        const receipt = await tx.wait();
        if (!receipt?.status) {
          throw new Error("审阅交易失败");
        }

        setMessage(endorse ? "已通过该脉冲情报。" : "已否决该脉冲情报。");
        await refreshPulses();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: (error as Error)?.message ?? "审阅失败",
        }));
      } finally {
        setState((prev) => ({ ...prev, isReviewing: false }));
      }
    },
    [contractWithSigner, refreshPulses]
  );

  const createStormChannel = useCallback(
    async (groupCID: string) => {
      if (!contractWithSigner) {
        setState((prev) => ({ ...prev, error: "缺少签名钱包" }));
        return;
      }
      try {
        const tx = await contractWithSigner.createStormChannel(groupCID);
        const receipt = await tx.wait();
        if (!receipt?.status) {
          throw new Error("创建风暴通道失败");
        }
        await refreshPulses();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: (error as Error)?.message ?? "创建风暴通道失败",
        }));
      }
    },
    [contractWithSigner, refreshPulses]
  );

  const linkPulseToChannel = useCallback(
    async (channelId: bigint, recordId: bigint) => {
      if (!contractWithSigner) {
        setState((prev) => ({ ...prev, error: "缺少签名钱包" }));
        return;
      }
      try {
        const tx = await contractWithSigner.linkPulseToChannel(channelId, recordId);
        const receipt = await tx.wait();
        if (!receipt?.status) {
          throw new Error("关联风暴通道失败");
        }
        await refreshPulses();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: (error as Error)?.message ?? "关联风暴通道失败",
        }));
      }
    },
    [contractWithSigner, refreshPulses]
  );

  const decryptPulse = useCallback(
    async (recordId: bigint) => {
      setIsDecrypting(true);
      try {
        await decryptPulses([recordId]);
      } finally {
        setIsDecrypting(false);
      }
    },
    [decryptPulses]
  );

  useEffect(() => {
    if (!contract) return;
    refreshPulses();
  }, [contract, refreshPulses]);

  const canLog = useMemo(() => {
    return Boolean(instance && contractWithSigner && ethersSigner && networkConfig?.address);
  }, [instance, contractWithSigner, ethersSigner, networkConfig?.address]);

  const canDecrypt = useMemo(() => {
    return Boolean(instance && ethersSigner && networkConfig?.address);
  }, [instance, ethersSigner, networkConfig?.address]);

  const isDeployed = useMemo(() => {
    return Boolean(networkConfig?.address && networkConfig.address !== ethers.ZeroAddress);
  }, [networkConfig?.address]);

  const isRefreshing = state.isLoading;

  return {
    pulses: state.pulseList,
    channels: state.channels,
    isRefreshing,
    isLogging: state.isLogging,
    isReviewing: state.isReviewing,
    error: state.error,
    message,
    isDecrypting,
    decryptedData: decryptedCache,
    networkConfig,
    isDeployed,
    canLog,
    canDecrypt,
    refreshPulses,
    logPulse,
    reviewPulse,
    decryptPulse,
    createStormChannel,
    linkPulseToChannel,
  };
}

function resolveStatus(status: number): PulseStatus {
  switch (status) {
    case 1:
      return "Verified";
    case 2:
      return "Rejected";
    case 3:
      return "Contested";
    default:
      return "Pending";
  }
}


