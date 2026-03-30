import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { 
  useActiveAccount, 
  useActiveWallet, 
  useDisconnect, 
  useReadContract,
  ConnectButton
} from "thirdweb/react";
import { client } from "./client";
import { prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { contract, chain } from "./contract";
import { theme } from "./theme";
import { useGeoCalibration } from "./hooks/useGeoCalibration";

// Components
import { AccountInfo } from "./components/AccountInfo";
import { DonorView } from "./components/DonorView";
import { NGOView } from "./components/NGOView";
import { BeneficiaryView } from "./components/BeneficiaryView.tsx";

export default function App() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  const [role, setRole] = useState<"donor" | "ngo" | "beneficiary" | null>(null);

  // GPS calibration — only active when the user is in NGO role
  const gps = useGeoCalibration(role === "ngo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campaign State
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  // Shared States (Passed to children)
  const [donationAmount, setDonationAmount] = useState("0.01");

  // --- DATA FETCHING (Thirdweb Hooks) ---
  const { data: countData, refetch: refetchCount } = useReadContract({
    contract,
    method: "function nextCampaignId() view returns (uint256)",
    params: []
  });
  const campaignCount = countData ? Number(countData) : null;

  const { data: campData, refetch: refetchCampaign } = useReadContract({
    contract,
    method: "function getCampaignDetails(uint256) view returns (string, uint256, uint256, uint256, uint8, bool, address, uint256, uint256, bool)",
    params: [BigInt(selectedCampaignId || 0)]
  });

  // ---- PROOFS: use readContract (async JSON ABI) instead of the hook ----
  // useReadContract cannot reliably decode tuple[] return types in thirdweb v5.
  const [proofsData, setProofsData] = useState<Array<{ cid: string; isLiveCapture: boolean }>>([]);

  const fetchProofs = async (campaignId: number): Promise<Array<{ cid: string; isLiveCapture: boolean }>> => {
    try {
      console.log(`[FETCH_PROOFS] Calling getProofs(${campaignId})...`);
      const raw = await readContract({
        contract,
        method: {
          type: "function",
          name: "getProofs",
          inputs: [{ name: "_campaignId", type: "uint256" }],
          outputs: [{
            name: "",
            type: "tuple[]",
            components: [
              { name: "cid",           type: "string" },
              { name: "isLiveCapture", type: "bool"   }
            ]
          }],
          stateMutability: "view"
        } as any,
        params: [BigInt(campaignId)]
      });
      const parsed = (Array.isArray(raw) ? raw : []).map((p: any) => ({
        cid:           (p.cid           ?? p[0] ?? "")   as string,
        isLiveCapture: (p.isLiveCapture !== undefined ? p.isLiveCapture : !!p[1]) as boolean
      }));
      console.log(`[FETCH_PROOFS] Received ${parsed.length} proof(s):`, parsed);
      setProofsData(parsed);
      return parsed;
    } catch (e) {
      console.error("[FETCH_PROOFS_ERROR]", e);
      return proofsData; // keep stale on error
    }
  };

  const { data: voteData, refetch: refetchVoted } = useReadContract({
    contract,
    method: "function hasVoted(uint256, address) view returns (bool)",
    params: [BigInt(selectedCampaignId || 0), account?.address || "0x0000000000000000000000000000000000000000"]
  });

  const campaign = campData;
  const hasVoted = !!voteData;

  const readData = async () => {
    const fetches: Promise<any>[] = [refetchCount(), refetchCampaign(), refetchVoted()];
    if (selectedCampaignId !== null) fetches.push(fetchProofs(selectedCampaignId));
    await Promise.all(fetches);
  };

  useEffect(() => {
    const syncData = async () => {
      const { data: currentCount } = await refetchCount();
      console.info(`[DEEP_DEBUG_SYNC] PROT0C0L_COUNT: ${currentCount}`);
      
      if (selectedCampaignId === null && currentCount !== undefined && Number(currentCount) > 0) {
        setSelectedCampaignId(Number(currentCount) - 1);
      }
      
      if (selectedCampaignId !== null || (currentCount !== undefined && Number(currentCount) > 0)) {
        await readData();
      }
    };
    syncData();
  }, [selectedCampaignId, countData, account?.address]);

  // Fetch proofs whenever the selected campaign changes
  useEffect(() => {
    if (selectedCampaignId !== null) fetchProofs(selectedCampaignId);
  }, [selectedCampaignId]);

  useEffect(() => {
    console.info(`[FETCH_PROOFS_STATE] proofsData length:`, proofsData.length, proofsData);
  }, [proofsData]);

  // Handle Role logic (mocking donations ledger for now on Amoy)
  const donations: any[] = [];

  const handleApprove = async () => {
    if (!account || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);

    try {
      // ── PRE-FLIGHT: read FRESH on-chain state to diagnose which require() fails ──
      console.log(`[APPROVE_PREFLIGHT] Reading fresh on-chain state for campaign #${selectedCampaignId}...`);
      console.log(`[APPROVE_PREFLIGHT] caller (account.address) = ${account.address}`);

      const fresh = await readContract({
        contract,
        method: "function getCampaignDetails(uint256) view returns (string, uint256, uint256, uint256, uint8, bool, address, uint256, uint256, bool)",
        params: [BigInt(selectedCampaignId)]
      }) as readonly [string, bigint, bigint, bigint, number, boolean, string, bigint, bigint, boolean];

      const [cName, cTarget, cDonated, , cStage, cActive, cNgo] = fresh;
      const threshold = cTarget / 10n;

      console.log(`[APPROVE_PREFLIGHT] campaign.name      = ${cName}`);
      console.log(`[APPROVE_PREFLIGHT] campaign.ngo       = ${cNgo}`);
      console.log(`[APPROVE_PREFLIGHT] caller             = ${account.address}`);
      console.log(`[APPROVE_PREFLIGHT] auth_ok            = ${account.address.toLowerCase() === cNgo.toLowerCase() ? "✅ caller IS ngo" : "❌ caller NOT ngo — this is the revert reason!"}`);
      console.log(`[APPROVE_PREFLIGHT] campaign.stage     = ${cStage} (need < 3)`);
      console.log(`[APPROVE_PREFLIGHT] campaign.isActive  = ${cActive}`);
      console.log(`[APPROVE_PREFLIGHT] campaign.donated   = ${ethers.formatEther(cDonated)} POL`);
      console.log(`[APPROVE_PREFLIGHT] 10% threshold      = ${ethers.formatEther(threshold)} POL`);
      console.log(`[APPROVE_PREFLIGHT] funding_gate_ok    = ${cDonated >= threshold ? "✅ funded" : `❌ underfunded — need ${ethers.formatEther(threshold - cDonated)} more POL`}`);

      // Surface a clear error BEFORE wasting gas if we already know it'll revert
      if (account.address.toLowerCase() !== cNgo.toLowerCase()) {
        throw new Error(`Not authorized: your address (${account.address.slice(0,8)}…) is not the campaign NGO (${cNgo.slice(0,8)}…). Did you create this campaign with a different wallet?`);
      }
      if (cStage >= 3) {
        throw new Error(`Campaign already completed (stage=${cStage}).`);
      }
      if (cStage === 0 && cDonated < threshold) {
        throw new Error(`10% funding gate not met: donated=${ethers.formatEther(cDonated)} POL, need ${ethers.formatEther(threshold)} POL.`);
      }

      console.log(`[APPROVE_PREFLIGHT] All checks passed — sending approveMilestone tx...`);
      const tx = prepareContractCall({
        contract,
        method: "function approveMilestone(uint256)",
        params: [BigInt(selectedCampaignId)]
      });
      const { transactionHash } = await sendTransaction({ transaction: tx, account });
      console.log(`[APPROVE_TX_SUCCESS] hash=${transactionHash}`);
      setTxHash(transactionHash);
      await readData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[APPROVE_FAIL]`, msg);
      setError("Approval failed: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVote = async (support: boolean) => {
    if (!account || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const tx = prepareContractCall({
        contract,
        method: "function vote(uint256, bool)",
        params: [BigInt(selectedCampaignId), support]
      });
      const { transactionHash } = await sendTransaction({ transaction: tx, account });
      setTxHash(transactionHash);
      await readData();
    } catch (e: any) {
      setError(e.message || "Voting failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestMilestone = async () => {
    if (!account || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const tx = prepareContractCall({
        contract,
        method: "function requestMilestoneRelease(uint256)",
        params: [BigInt(selectedCampaignId)]
      });
      const { transactionHash } = await sendTransaction({ transaction: tx, account });
      setTxHash(transactionHash);
      await readData();
    } catch (e: unknown) {
      setError("Milestone request failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDonate = async () => {
    if (!account || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);

    // Snapshot donated amount BEFORE tx so we can detect the change
    const donatedBefore = campData?.[2];
    console.log(`[DONATE_START] campaignId=${selectedCampaignId} | amount=${donationAmount} POL`);
    console.log(`[DONATE_START] donated_before=${donatedBefore !== undefined ? ethers.formatEther(donatedBefore) + " POL" : "unknown (campData not loaded yet)"}`);
    console.log(`[DONATE_START] campData raw:`, campData);

    try {
      const tx = prepareContractCall({
        contract,
        method: "function donate(uint256) payable",
        params: [BigInt(selectedCampaignId)],
        value: ethers.parseEther(donationAmount)
      });
      const { transactionHash } = await sendTransaction({ transaction: tx, account });
      console.log(`[DONATE_TX_SUCCESS] hash=${transactionHash} | Polling for on-chain state...`);
      setTxHash(transactionHash);

      // Poll refetchCampaign until the donated amount changes (max 12 × 2.5s = 30s)
      let retries = 0;
      let synced = false;
      while (retries < 12) {
        await new Promise(r => setTimeout(r, 2500));
        const { data: latest } = await refetchCampaign();
        const donatedAfter = latest?.[2];
        console.log(
          `[DONATE_POLL] attempt=${retries + 1}/12 | donated_now=${donatedAfter !== undefined ? ethers.formatEther(donatedAfter) + " POL" : "undefined"} | donatedBefore=${donatedBefore !== undefined ? ethers.formatEther(donatedBefore) + " POL" : "unknown"}`
        );
        // Compare as strings to avoid bigint equality pitfalls
        if (donatedAfter !== undefined && donatedAfter?.toString() !== donatedBefore?.toString()) {
          console.log(`[DONATE_SYNCED] New on-chain donated: ${ethers.formatEther(donatedAfter)} POL ✅`);
          synced = true;
          break;
        }
        retries++;
      }
      if (!synced) console.warn(`[DONATE_SYNC_TIMEOUT] donated amount unchanged after 30s — RPC may be lagging`);

      // Final full refresh for all state
      await readData();
      console.log(`[DONATE_COMPLETE] readData() done. campData after:`, campData);
    } catch (e: any) {
      console.error(`[DONATE_FAIL]`, e);
      setError("Donation failed: " + (e.message || String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCampaign = async (name: string, targetGoalEth: string) => {
    if (!account) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    const oldCount = Number(countData || 0);

    try {
      const tx = prepareContractCall({
        contract,
        method: "function createCampaign(string, uint256)",
        params: [name, ethers.parseEther(targetGoalEth)]
      });
      const { transactionHash } = await sendTransaction({ transaction: tx, account });
      setTxHash(transactionHash);
      
      // POLL: Wait up to 15 seconds for the counter to increment on-chain
      let retryCount = 0;
      while (retryCount < 8) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s
        const { data: latestCount } = await refetchCount();
        const currentCount = Number(latestCount || 0);
        
        console.log(`Sync Polling: Old=${oldCount}, Current=${currentCount}`);

        if (currentCount > oldCount) {
          const newId = currentCount - 1;
          setSelectedCampaignId(newId);
          // Force a full data refresh for the new ID
          await Promise.all([refetchCount(), refetchCampaign(), fetchProofs(newId), refetchVoted()]);
          return; // Success!
        }
        retryCount++;
      }
      
      // Fallback if polling timed out
      await readData();
    } catch (e: any) {
      setError("Campaign creation failed: " + (e.message || String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  const normalizedCampaign = campaign ? {
    name: campaign[0] as string,
    target: campaign[1].toString(),
    donated: campaign[2].toString(),
    released: campaign[3].toString(),
    stage: Number(campaign[4]),
    isActive: campaign[5] as boolean,
    ngo: campaign[6] as string,
    yesVotes: Number(campaign[7]),
    noVotes: Number(campaign[8]),
    milestoneRequested: campaign[9] === true
  } : null;

  // proofsData is already normalised by fetchProofs — use directly
  const normalizedProofs = proofsData;

  return (
    <div style={theme.app}>
      {/* GLOBAL ERROR HUD */}
      {error && (
        <div style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 10000, background: "#ef4444", color: "white", padding: "1rem 2rem", borderRadius: "1rem", fontWeight: "900", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", border: "2px solid #7f1d1d", fontSize: "0.85rem", maxWidth: "90vw", textAlign: "center" }}>
          ⚠️ PROTOCOL_CRITICAL: {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "1.5rem", background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "0.5rem", padding: "0.2rem 0.6rem", cursor: "pointer" }}>DISMISS</button>
        </div>
      )}

      <div style={{ ...theme.card, marginTop: "2rem" }}>
        <header style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "linear-gradient(135deg, #3b82f611, #10b98111)", padding: "1rem 2rem", borderRadius: "1.5rem", border: "1px solid #1e293b", marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "900", background: "linear-gradient(to right, #3b82f6, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
              ReliefDAO {selectedCampaignId !== null && campaign ? `- ${campaign[0]}` : ""}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem", fontWeight: "500", letterSpacing: "0.05em" }}>
              DECENTRALIZED DISASTER PROTOCOL
            </p>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            {!account ? (
              <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #334155" }}>
                <h3 style={{ fontSize: "1rem", margin: "0 0 1rem 0", textAlign: "center", color: "#94a3b8" }}>Authentication</h3>
                <div style={{ display: "flex", justifyContent: "center" }}>
                   <ConnectButton
                      client={client}
                      chain={chain}
                      accountAbstraction={{
                        chain: chain,
                        sponsorGas: true
                      }}
                      theme={"dark"}
                    />
                </div>
              </div>
            ) : (
              <div style={{ background: "#0f172a", padding: "1rem 1.5rem", borderRadius: "1rem", border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <AccountInfo 
                    address={account.address} 
                    onDisconnect={() => { if(wallet) disconnect(wallet); }} 
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {!account ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#475569" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🌍</div>
            <h2 style={{ color: "#94a3b8", fontSize: "1.5rem", fontWeight: "700" }}>Welcome to ReliefDAO</h2>
            <p style={{ maxWidth: "400px", margin: "1rem auto", lineHeight: "1.6" }}>
              Connect your wallet to participate in decentralized humanitarian aid and transparent milestone verification.
            </p>
          </div>
        ) : (
          <>
            {!role ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", padding: "1rem 0" }}>
                {[
                  { id: "donor", title: "Donor Portal", desc: "Contribute to life-saving campaigns and audit fund trails in real-time.", color: "#3b82f6", icon: "💎" },
                  { id: "ngo", title: "NGO Workspace", desc: "Manage tranches, upload proof of execution, and request milestone releases.", color: "#10b981", icon: "🏗️" },
                  { id: "beneficiary", title: "Beneficiary Hub", desc: "Registered community members can verify milestones and vote for release.", color: "#8b5cf6", icon: "⚖️" }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id as any)}
                    style={{ ...theme.card, border: `1px solid ${r.color}33`, textAlign: "left", transition: "all 0.3s ease", cursor: "pointer", position: "relative", overflow: "hidden" }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{r.icon}</div>
                    <h3 style={{ color: r.color, fontSize: "1.25rem", fontWeight: "800", marginBottom: "0.5rem" }}>{r.title}</h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.5" }}>{r.desc}</p>
                    <div style={{ marginTop: "1.5rem", color: r.color, fontWeight: "bold", fontSize: "0.8rem" }}>ACCESS PORTAL →</div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={theme.badge && { background: role === "beneficiary" ? "#8b5cf6" : role === "donor" ? "#3b82f6" : "#10b981", color: "white", padding: "0.2rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontWeight: "bold" }}>
                    ROLE: {role.toUpperCase()}
                  </div>
                  <button onClick={() => { setRole(null); setSelectedCampaignId(null); }} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.75rem" }}>Change Role</button>
                </div>

                {role === "donor" && (
                  <DonorView
                    campaignCount={campaignCount || 0}
                    selectedCampaignId={selectedCampaignId}
                    setSelectedCampaignId={setSelectedCampaignId}
                    campaign={normalizedCampaign}
                    donations={donations}
                    proofs={normalizedProofs}
                    onDonate={handleDonate}
                    donationAmount={donationAmount}
                    setDonationAmount={setDonationAmount}
                    isProcessing={isProcessing}
                    signer={null}
                  />
                )}
                {role === "ngo" && (
                  <>
                    {(selectedCampaignId !== null && !normalizedCampaign) ? (
                      <div style={{ ...theme.glass, padding: "5rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📡</div>
                        <h3 style={{ color: "#f8fafc" }}>Synchronizing Protocol</h3>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Linking your new relay on-chain. Please wait a moment...</p>
                      </div>
                    ) : (
                      <NGOView
                        campaignCount={campaignCount || 0}
                        selectedCampaignId={selectedCampaignId}
                        setSelectedCampaignId={setSelectedCampaignId}
                        campaign={normalizedCampaign}
                        proofs={normalizedProofs}
                        donations={donations}
                        onCreateCampaign={handleCreateCampaign}
                        onApprove={handleApprove}
                        onRequestMilestone={handleRequestMilestone}
                        onUploadProof={async (file: File, isLive: boolean) => {
                          if (!account || selectedCampaignId === null) return;
                          setIsProcessing(true);
                          setTxHash(null);
                          setError(null);
                          console.log(`[PROTOCOL_START] Uploading ${isLive ? "LIVE" : "DOC"} evidence...`);
                          try {
                            // Phase 1: Pinata Storage
                            const formData = new FormData();
                            formData.append("file", file);
                            const pinataMetadata = JSON.stringify({
                              name: `${isLive ? "LIVE" : "DOC"}_RELI3F_${Date.now()}`,
                              keyvalues: {
                                latitude: gps.lat?.toString() || "0",
                                longitude: gps.lng?.toString() || "0",
                                campaignId: selectedCampaignId.toString(),
                                isLive: isLive.toString()
                              }
                            });
                            formData.append("pinataMetadata", pinataMetadata);

                            const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
                              method: "POST",
                              headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` },
                              body: formData
                            });

                            if (!res.ok) throw new Error("Pinata pinning failed. Check JWT.");
                            const resData = await res.json();
                            const cid = resData.IpfsHash;
                            console.log(`[IPFS_SUCCESS] CID: ${cid}`);

                            // Phase 2: Blockchain Commitment
                            const tx = prepareContractCall({
                              contract,
                              method: "function submitProof(uint256, string, bool)",
                              params: [BigInt(selectedCampaignId), cid, isLive]
                            });
                            const { transactionHash } = await sendTransaction({ transaction: tx, account });
                            console.log(`[BLOCKCHAIN_SUCCESS] TX: ${transactionHash}`);
                            setTxHash(transactionHash);

                            // Phase 3: Protocol Re-Sync — poll until proof count grows
                            console.log(`[SYNC_START] Polling for evidence registry update...`);
                            const oldCount = proofsData.length;
                            let retries = 0;

                            while (retries < 15) {
                              await new Promise(r => setTimeout(r, 2000));
                              const latest = await fetchProofs(selectedCampaignId);
                              console.log(`[SYNC_POLL] attempt=${retries + 1} old=${oldCount} new=${latest.length}`);
                              if (latest.length > oldCount) {
                                console.log(`[SYNC_COMPLETE] PROOFS_COUNT: ${latest.length}`);
                                break;
                              }
                              retries++;
                            }

                            if (retries >= 15) console.warn(`[SYNC_TIMEOUT] proof count did not grow after 15 polls`);
                          } catch (e: any) {
                            const errMsg = e.message || String(e);
                            console.error(`[PROTOCOL_FAILURE] ${errMsg}`);
                            setError("Protocol Sync Error: " + errMsg);
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        isProcessing={isProcessing}
                        gps={gps}
                      />
                    )}
                  </>
                )}
                {role === "beneficiary" && (
                  <BeneficiaryView
                    campaignCount={campaignCount || 0}
                    selectedCampaignId={selectedCampaignId}
                    setSelectedCampaignId={setSelectedCampaignId}
                    campaign={normalizedCampaign}
                    proofs={normalizedProofs}
                    donations={donations}
                    hasVoted={hasVoted}
                    onVote={handleVote}
                    isProcessing={isProcessing}
                    account={account.address}
                    signer={null}
                  />
                )}
              </>
            )}
          </>
        )}

        {txHash && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#064e3b", borderRadius: "0.75rem", color: "#4ade80", fontSize: "0.8rem", textAlign: "center", border: "1px solid #059669" }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>✅ Transaction Successful</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>Relief Dashboard Updated</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#450a0a", borderRadius: "0.75rem", color: "#f87171", fontSize: "0.8rem", textAlign: "center", border: "1px solid #7f1d1d" }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>❌ Error Occurred</div>
            {error}
          </div>
        )}
      </div>

    </div>
  );
}
