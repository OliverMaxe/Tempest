"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useTempestSentinel, type PulseEntry } from "@/hooks/useTempestSentinel";

const WEATHER_THEMES = [
  { id: 1, label: "雷暴脉冲", icon: "⛈", tone: "bg-gradient-to-br from-[#f4d6b0] to-[#eebb88]" },
  { id: 2, label: "旋风入侵", icon: "🌪", tone: "bg-gradient-to-br from-[#b6d4f0] to-[#8ab3d8]" },
  { id: 3, label: "极端降雨", icon: "🌧", tone: "bg-gradient-to-br from-[#c6e3e9] to-[#99c7cf]" },
  { id: 4, label: "山洪暴发", icon: "🌊", tone: "bg-gradient-to-br from-[#d0f0e0] to-[#9cc8af]" },
  { id: 5, label: "炙热热浪", icon: "🔥", tone: "bg-gradient-to-br from-[#f7c0a6] to-[#e6976f]" },
  { id: 6, label: "寒潮冰暴", icon: "❄", tone: "bg-gradient-to-br from-[#e3ecf5] to-[#b4c6df]" },
] as const;

const emptyPulse: PulseEntry | null = null;

export const TempestSentinelStudio = () => {
  const { storage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const tempest = useTempestSentinel({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage: storage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [activeView, setActiveView] = useState<"dashboard" | "new" | "review">("dashboard");
  const [focusedPulse, setFocusedPulse] = useState<PulseEntry | null>(emptyPulse);
  const [formState, setFormState] = useState({
    eventType: 1,
    intensity: 5,
    precipitation: 0,
    evidenceCID: "",
    sensorHash: "",
    locationHint: "",
    hasMedia: false,
  });

  const pendingPulses = useMemo(
    () => tempest.pulses.filter((pulse) => pulse.status === "Pending"),
    [tempest.pulses]
  );


  const handleSubmit = async () => {
    if (!tempest.canLog) return;

    const sensorHash = formState.sensorHash
      ? ethers.keccak256(ethers.toUtf8Bytes(formState.sensorHash))
      : ethers.ZeroHash;

    const locationHash = formState.locationHint
      ? ethers.keccak256(ethers.toUtf8Bytes(formState.locationHint))
      : ethers.ZeroHash;

    await tempest.logPulse({
      eventType: formState.eventType,
      evidenceCID: formState.evidenceCID,
      intensityScore: BigInt(Math.round(formState.intensity * 1000)),
      precipitationMm: BigInt(Math.round(formState.precipitation * 100)),
      sensorHash,
      locationHash,
      hasEncryptedMediaKey: formState.hasMedia,
    });
  };

  if (!isConnected) {
    return (
      <div className="canvas-bg min-h-screen flex items-center justify-center p-6">
        <div className="max-w-4xl w-full card-soft border-l-4 border-[rgba(61,90,64,0.35)] p-12 space-y-10">
          <div className="space-y-4 text-center md:text-left">
            <span className="badge-soft">Tempest Sentinel · Weather Stewardship</span>
            <h1 className="text-4xl md:text-5xl font-semibold text-[var(--canopy-ink)]">
              守护极端天气的森林调度站
            </h1>
            <p className="text-lg text-[var(--canopy-fern)]/80">
              连接 MetaMask，即可在本地 FHEVM 节点上提交加密的极端天气脉冲，
              与全球志愿者共同维护气候数据的真实性与隐私性。
            </p>
          </div>

          <div className="grid md:grid-cols-[220px_1fr] gap-6 items-center">
            <button onClick={connect} className="button-tonal text-base">
              连接 MetaMask 钱包
            </button>
            <div className="text-sm text-[var(--canopy-ink)]/60 font-[\'Fira Mono\',monospace] space-y-1">
              <p>建议网络：Hardhat 31337 · FHE Mock 模式</p>
              <p>站点守护者：Tempest Sentinel 本地节点</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tempest.isDeployed === false) {
    return (
      <div className="canvas-bg min-h-screen flex items-center justify-center p-6">
        <div className="card-soft p-10 space-y-6 text-center">
          <div className="text-5xl">🛠</div>
          <h2 className="text-3xl font-semibold text-[var(--canopy-ink)]">尚未部署 TempestSentinel 合约</h2>
          <p className="text-[var(--canopy-ink)]/70">
            当前网络 （Chain ID: {chainId}） 未检测到部署记录，请先在合约目录执行部署脚本。
          </p>
          <div className="card-soft bg-white/80 border border-[rgba(61,90,64,0.15)] p-6 text-left text-sm font-[\'Fira Mono\',monospace]">
            <p className="text-[var(--canopy-fern)]"># 部署指令</p>
            <p>cd 天气02/action/contracts</p>
            <p>npx hardhat deploy --network localhost</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-bg min-h-screen">
      <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
        {/* Left navigation */}
        <aside className="side-panel px-6 py-8 flex flex-col gap-10">
          <div className="space-y-1">
            <span className="badge-soft">Tempest Sentinel</span>
            <h1 className="text-2xl font-semibold text-[var(--canopy-ink)]">气候林地工作台</h1>
            <p className="text-sm text-[var(--canopy-ink)]/60">
              本地 FHE 节点：{accounts?.[0]?.slice(0, 6)}...{accounts?.[0]?.slice(-4)}
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-sm font-medium">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`text-left px-4 py-3 rounded-2xl transition-all ${
                activeView === "dashboard"
                  ? "bg-[var(--canopy-fern)] text-white shadow-lg"
                  : "text-[var(--canopy-ink)]/70 hover:bg-white"
              }`}
            >
              情报总览
            </button>
            <button
              onClick={() => setActiveView("new")}
              className={`text-left px-4 py-3 rounded-2xl transition-all ${
                activeView === "new"
                  ? "bg-[var(--canopy-moss)] text-white shadow-lg"
                  : "text-[var(--canopy-ink)]/70 hover:bg-white"
              }`}
            >
              记录脉冲
            </button>
            <button
              onClick={() => setActiveView("review")}
              className={`text-left px-4 py-3 rounded-2xl transition-all ${
                activeView === "review"
                  ? "bg-[var(--canopy-sky)] text-white shadow-lg"
                  : "text-[var(--canopy-ink)]/70 hover:bg-white"
              }`}
            >
              审阅席位
            </button>
          </nav>

          <div className="space-y-4">
            <h3 className="section-title">节点快照</h3>
            <div className="card-soft p-5 space-y-3">
              <div className="flex justify-between text-sm font-[\'Fira Mono\',monospace]">
                <span>FHEVM</span>
                <span className="text-[var(--canopy-fern)]">{fhevmStatus === "ready" ? "READY" : "INIT"}</span>
              </div>
              <div className="flex justify-between text-sm font-[\'Fira Mono\',monospace]">
                <span>NETWORK</span>
                <span className="text-[var(--canopy-fern)]">{chainId === 31337 ? "HARDHAT" : chainId}</span>
              </div>
              <div className="flex justify-between text-sm font-[\'Fira Mono\',monospace]">
                <span>MODE</span>
                <span className="text-[var(--canopy-fern)]">MOCK</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="section-title">统计</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="stat-block">
                <span className="text-xs text-[var(--canopy-ink)]/55">TOTAL</span>
                <p className="text-2xl text-[var(--canopy-ink)] mt-1">{tempest.pulses.length}</p>
              </div>
              <div className="stat-block">
                <span className="text-xs text-[var(--canopy-ink)]/55">PENDING</span>
                <p className="text-2xl text-[var(--canopy-fern)] mt-1">{pendingPulses.length}</p>
              </div>
              <div className="stat-block">
                <span className="text-xs text-[var(--canopy-ink)]/55">VERIFIED</span>
                <p className="text-2xl text-[var(--canopy-copper)] mt-1">
                  {tempest.pulses.filter((p) => p.status === "Verified").length}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="p-6 md:p-10 space-y-10">
          {(tempest.error || tempest.message) && (
            <div className={`card-soft px-6 py-4 border ${
              tempest.error ? "border-[var(--canopy-copper)] text-[var(--canopy-copper)]" : "border-[var(--canopy-fern)] text-[var(--canopy-fern)]"
            } font-[\'Fira Mono\',monospace] text-sm`}
            >
              {tempest.error ?? tempest.message}
            </div>
          )}
          {/* Hero area */}
          {activeView === "dashboard" && (
            <>
              <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch">
                <div className="card-soft p-0 map-card">
                  <div className="h-full w-full bg-gradient-to-br from-[var(--canopy-sky)]/50 via-white/60 to-[var(--canopy-sand)]/70" />
                  <svg
                    className="absolute inset-0 h-full w-full text-[var(--canopy-fern)]/25"
                    viewBox="0 0 400 200"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.6" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-between p-8 text-[var(--canopy-ink)]">
                    <div className="space-y-2 max-w-xl">
                      <span className="badge-soft">TEMPEST SENTINEL</span>
                      <h2 className="text-3xl font-semibold">全球极端天气情报台</h2>
                      <p className="max-w-xl text-sm text-[var(--canopy-ink)]/75">
                        通过 FHEVM 在本地安全记录脉冲数据，
                        以森林调度的方式聚合并验证来自各地的异常气象情报。
                      </p>
                    </div>
                    <button
                      onClick={tempest.refreshPulses}
                      disabled={tempest.isRefreshing}
                      className="self-start button-tonal"
                    >
                      {tempest.isRefreshing ? "刷新中..." : "刷新脉冲列表"}
                    </button>
                  </div>
                </div>

                <div className="card-soft p-6 space-y-6">
                  <h3 className="section-title">脉冲情报</h3>
                  {tempest.pulses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-sm text-[var(--canopy-ink)]/60 py-8">
                      <div className="text-5xl">🛰</div>
                      <p>暂无脉冲记录，等待首位观察员提交。</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                      {tempest.pulses.map((pulse) => {
                        const theme = WEATHER_THEMES.find((t) => t.id === pulse.eventType) ?? WEATHER_THEMES[0];
                        return (
                          <button
                            key={pulse.id.toString()}
                            onClick={() => setFocusedPulse(pulse)}
                            className="w-full text-left card-soft border border-[rgba(61,90,64,0.15)] p-4 hover:border-[var(--canopy-fern)]/40 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl ${theme.tone} flex items-center justify-center text-xl`}>{theme.icon}</div>
                              <div className="flex-1">
                                <div className="text-xs font-[\'Fira Mono\',monospace] text-[var(--canopy-ink)]/60">
                                  PULSE #{pulse.id.toString()} · {new Date(pulse.timestamp * 1000).toLocaleString()}
                                </div>
                                <div className="text-[var(--canopy-ink)] font-semibold">{theme.label}</div>
                              </div>
                              <span className="text-xs font-[\'Fira Mono\',monospace] text-[var(--canopy-fern)]">
                                ✓ {pulse.approveCount} / ✗ {pulse.rejectCount}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {focusedPulse && (
                <section className="card-soft p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title">脉冲详情</h3>
                    <button onClick={() => setFocusedPulse(emptyPulse)} className="text-sm text-[var(--canopy-ink)]/50 hover:text-[var(--canopy-ink)]">
                      收起
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="card-soft p-5 space-y-2 border border-[rgba(61,90,64,0.12)]">
                      <span className="text-xs text-[var(--canopy-ink)]/55">状态</span>
                      <p className="text-lg text-[var(--canopy-ink)]">{focusedPulse.status}</p>
                    </div>
                    <div className="card-soft p-5 space-y-2 border border-[rgba(61,90,64,0.12)]">
                      <span className="text-xs text-[var(--canopy-ink)]/55">已确认</span>
                      <p className="text-lg text-[var(--canopy-fern)]">{focusedPulse.approveCount}</p>
                    </div>
                    <div className="card-soft p-5 space-y-2 border border-[rgba(61,90,64,0.12)]">
                      <span className="text-xs text-[var(--canopy-ink)]/55">驳回</span>
                      <p className="text-lg text-[var(--canopy-copper)]">{focusedPulse.rejectCount}</p>
                    </div>
                  </div>

                  <div className="card-soft p-6 border border-[rgba(61,90,64,0.12)] space-y-2 text-sm font-[\'Fira Mono\',monospace] text-[var(--canopy-ink)]/70">
                    <p>提交者：{focusedPulse.submitter}</p>
                    <p>时间：{new Date(focusedPulse.timestamp * 1000).toLocaleString()}</p>
                    {focusedPulse.evidenceCID && <p>证据：{focusedPulse.evidenceCID}</p>}
                  </div>

                  <button
                    onClick={() => tempest.decryptPulse(focusedPulse.id)}
                    disabled={!tempest.canDecrypt || tempest.isDecrypting || !!tempest.decryptedData[focusedPulse.id.toString()]}
                    className="button-tonal"
                  >
                    {tempest.isDecrypting ? "解密中..." : "解密加密指标"}
                  </button>

                  {tempest.decryptedData[focusedPulse.id.toString()] && (
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="card-soft p-5">
                        <span className="text-xs text-[var(--canopy-ink)]/55">强度值</span>
                        <p className="text-2xl text-[var(--canopy-ink)]">
                          {tempest.decryptedData[focusedPulse.id.toString()].intensity.toFixed(1)}
                        </p>
                      </div>
                      <div className="card-soft p-5">
                        <span className="text-xs text-[var(--canopy-ink)]/55">降水量</span>
                        <p className="text-2xl text-[var(--canopy-ink)]">
                          {tempest.decryptedData[focusedPulse.id.toString()].precipitation.toFixed(1)} mm
                        </p>
                      </div>
                      <div className="card-soft p-5">
                        <span className="text-xs text-[var(--canopy-ink)]/55">媒体秘钥</span>
                        <p className="text-2xl text-[var(--canopy-ink)]">
                          {tempest.decryptedData[focusedPulse.id.toString()].hasMediaKey ? "已附带" : "无"}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {activeView === "new" && (
            <section className="space-y-8">
              <div className="card-soft p-6 space-y-3">
                <h2 className="text-2xl font-semibold text-[var(--canopy-ink)]">记录新的天气脉冲</h2>
                <p className="text-sm text-[var(--canopy-ink)]/60">
                  选择事件类型及强度指标，凭借本地 FHE VM 自动生成加密输入。
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[280px_1fr] items-start">
                <div className="card-soft p-6 space-y-4">
                  <h3 className="section-title">事件类型</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {WEATHER_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setFormState({ ...formState, eventType: theme.id })}
                        className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-left border transition ${
                          formState.eventType === theme.id
                            ? "border-[var(--canopy-fern)] bg-white"
                            : "border-transparent hover:border-[rgba(61,90,64,0.2)]"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl ${theme.tone} flex items-center justify-center text-2xl`}>{theme.icon}</div>
                        <div>
                          <div className="font-semibold text-[var(--canopy-ink)]">{theme.label}</div>
                          <div className="text-xs text-[var(--canopy-ink)]/55">#{theme.id.toString().padStart(2, "0")}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card-soft p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="section-title">强度 (1-10)</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formState.intensity}
                        onChange={(e) => setFormState({ ...formState, intensity: Number(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-3xl font-semibold text-[var(--canopy-ink)]">{formState.intensity}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="section-title">降水量 (mm)</label>
                      <input
                        type="number"
                        value={formState.precipitation}
                        onChange={(e) => setFormState({ ...formState, precipitation: Number(e.target.value) })}
                        className="w-full border border-[rgba(61,90,64,0.25)] rounded-2xl px-4 py-2 focus:outline-none focus:border-[var(--canopy-fern)]"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="section-title">证据 CID</label>
                      <input
                        type="text"
                        value={formState.evidenceCID}
                        onChange={(e) => setFormState({ ...formState, evidenceCID: e.target.value })}
                        className="w-full border border-[rgba(61,90,64,0.25)] rounded-2xl px-4 py-2 focus:outline-none focus:border-[var(--canopy-fern)]"
                        placeholder="ipfs://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="section-title">传感器哈希原文</label>
                      <input
                        type="text"
                        value={formState.sensorHash}
                        onChange={(e) => setFormState({ ...formState, sensorHash: e.target.value })}
                        className="w-full border border-[rgba(61,90,64,0.25)] rounded-2xl px-4 py-2 focus:outline-none focus:border-[var(--canopy-fern)]"
                        placeholder='{"device":"WX-09","gust":32.5}'
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="section-title">位置提示 (可选)</label>
                    <input
                      type="text"
                      value={formState.locationHint}
                      onChange={(e) => setFormState({ ...formState, locationHint: e.target.value })}
                      className="w-full border border-[rgba(61,90,64,0.25)] rounded-2xl px-4 py-2 focus:outline-none focus:border-[var(--canopy-fern)]"
                      placeholder="city:district:blur=5km"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="checkbox-pill"
                      data-active={formState.hasMedia}
                      onClick={() => setFormState({ ...formState, hasMedia: !formState.hasMedia })}
                      role="switch"
                      aria-checked={formState.hasMedia}
                    />
                    <span className="text-sm text-[var(--canopy-ink)]/70">附带外部加密媒体标记</span>
                  </div>

                  <button onClick={handleSubmit} disabled={!tempest.canLog} className="button-tonal w-full py-3">
                    {tempest.isLogging ? "提交中..." : "提交加密脉冲"}
                  </button>

                  {tempest.message && (
                    <div className="card-soft border border-[rgba(61,90,64,0.2)] p-4 text-sm text-[var(--canopy-fern)]">
                      {tempest.message}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeView === "review" && (
            <section className="space-y-6">
              <div className="card-soft p-6 space-y-2">
                <h2 className="text-2xl font-semibold text-[var(--canopy-ink)]">审阅席位</h2>
                <p className="text-sm text-[var(--canopy-ink)]/60">
                  确认或驳回待审核的脉冲，实时维护气候档案的可信度。
                </p>
              </div>

              {pendingPulses.length === 0 ? (
                <div className="card-soft p-10 text-center space-y-3 text-[var(--canopy-ink)]/60">
                  <div className="text-5xl">🌤</div>
                  <p>暂无待审核脉冲。</p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {pendingPulses.map((pulse) => {
                    const theme = WEATHER_THEMES.find((t) => t.id === pulse.eventType) ?? WEATHER_THEMES[0];
                    return (
                      <div key={pulse.id.toString()} className="card-soft p-6 space-y-4 border border-[rgba(61,90,64,0.1)]">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className={`w-16 h-16 rounded-3xl ${theme.tone} flex items-center justify-center text-3xl`}>{theme.icon}</div>
                          <div className="flex-1">
                            <p className="text-sm text-[var(--canopy-ink)]/60 font-[\'Fira Mono\',monospace]">
                              PULSE #{pulse.id.toString()} · {new Date(pulse.timestamp * 1000).toLocaleString()}
                            </p>
                            <h3 className="text-xl font-semibold text-[var(--canopy-ink)]">{theme.label}</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs font-[\'Fira Mono\',monospace] text-[var(--canopy-ink)]/70">
                            <div className="card-soft p-3">✓ {pulse.approveCount}</div>
                            <div className="card-soft p-3">✗ {pulse.rejectCount}</div>
                          </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => tempest.reviewPulse({ recordId: pulse.id, endorse: true, reviewCID: "" })}
                            disabled={tempest.isReviewing}
                            className="button-tonal flex-1"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => tempest.reviewPulse({ recordId: pulse.id, endorse: false, reviewCID: "" })}
                            disabled={tempest.isReviewing}
                            className="button-tonal flex-1"
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
