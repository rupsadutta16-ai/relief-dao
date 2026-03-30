import { useState, useEffect } from "react";
import { ethers } from "ethers";

// --- THIRDWEB IMPORTS COMMENTED OUT ---
// import { useActiveAccount, useActiveWallet, useDisconnect, useReadContract } from "thirdweb/react";
// import { client } from "./client";
// import { privateKeyToAccount } from "thirdweb/wallets";
// import { waitForReceipt, prepareContractCall, sendTransaction } from "thirdweb";
// import { upload } from "thirdweb/storage";

import { contractAddress, contractABI } from "./contract";
import { theme } from "./theme";
import { useGeoCalibration } from "./hooks/useGeoCalibration";

// Components
import { AccountInfo } from "./components/AccountInfo";
import { DonorView } from "./components/DonorView";
import { NGOView } from "./components/NGOView";
import { BeneficiaryView } from "./components/BeneficiaryView";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const [role, setRole] = useState<"donor" | "ngo" | "beneficiary" | null>(null);

  // GPS calibration — only active when the user is in NGO role
  const gps = useGeoCalibration(role === "ngo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campaign State
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  // Shared States (Passed to children)
  const [liveFile, setLiveFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [docFileKey, setDocFileKey] = useState(0);     // increment to reset doc input
  const [uploadPhase, setUploadPhase] = useState<null | "ipfs" | "chain">(null);
  const [isUploading, setIsUploading] = useState(false);
  const [donationAmount, setDonationAmount] = useState("0.01");

  // Contract Data
  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [proofs, setProofs] = useState<{ cid: string, isLiveCapture: boolean }[] | undefined>(undefined);
  const [readError, setReadError] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [donations, setDonations] = useState<{ donor: string, amount: string, txHash: string }[]>([]);

  const handleConnectMetamask = async () => {
    try {
      if ((window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        await browserProvider.send("eth_requestAccounts", []);

        const targetChainId = "0x7a69"; // 31337 in hex
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainId,
                  chainName: "Localhost 8545",
                  rpcUrls: ["http://127.0.0.1:8545"],
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
        const connectedSigner = await browserProvider.getSigner();
        setAccount(await connectedSigner.getAddress());
        setProvider(browserProvider);
        setSigner(connectedSigner);
      } else {
        setError("MetaMask is not installed.");
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("same RPC endpoint") || msg.includes("0x539")) {
        setError("MetaMask Conflict: Please open MetaMask -> Settings -> Networks, click on 'Localhost 8545', and change the Chain ID to 31337 (or delete it and click connect again).");
      } else {
        setError("Failed to connect MetaMask: " + msg);
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setRole(null);
    setSelectedCampaignId(null);
  };

  // Listen to MetaMask account and chain changes
  useEffect(() => {
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        if (provider) {
          const newSigner = await provider.getSigner();
          setAccount(await newSigner.getAddress());
          setSigner(newSigner);
        }
      } else {
        disconnect();
      }
    };

    const handleChainChanged = () => {
      // Reload the page if the user changes the network manually inside MetaMask
      window.location.reload();
    };

    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);
    }
    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [provider]);

  const readData = async () => {
    try {
      // Use JsonRpcProvider for read-only calls so we don't rely only on MetaMask being connected
      const rpcProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const readContract = new ethers.Contract(contractAddress, contractABI, rpcProvider);

      const count = await readContract.nextCampaignId();
      setCampaignCount(Number(count));

      if (selectedCampaignId !== null) {
        const campData = await readContract.getCampaignDetails(selectedCampaignId);
        setCampaign(campData);

        const pf = await readContract.getProofs(selectedCampaignId);
        setProofs(pf.map((p: any) => ({ cid: p.cid, isLiveCapture: p.isLiveCapture })));

        if (account) {
          const votedState = await readContract.hasVoted(selectedCampaignId, account);
          setHasVoted(votedState);
        }

        // Fetch Donation history for the transparency ledger
        const filter = readContract.filters.DonationReceived(selectedCampaignId);
        const latestBlock = await rpcProvider.getBlockNumber();
        const startBlock = Math.max(0, latestBlock - 10000);
        const logs = await readContract.queryFilter(filter, startBlock); 

        const parsedDonations = logs.map(l => {
          try {
            const parsed = readContract.interface.parseLog(l);
            if (!parsed) return null;
            return {
              donor: parsed.args.donor as string,
              amount: ethers.formatEther(parsed.args.amount),
              txHash: l.transactionHash
            };
          } catch (e) {
            console.error("Parse log error:", e);
            return null;
          }
        }).filter((d): d is { donor: string, amount: string, txHash: string } => d !== null).reverse();
        
        setDonations(parsedDonations);
      }
    } catch (e: unknown) {
      console.error("Read error:", e);
      setReadError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  useEffect(() => {
    readData();
    const interval = setInterval(() => {
      readData();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedCampaignId]);

  useEffect(() => {
    if (selectedCampaignId === null && campaignCount !== null && campaignCount > 0) {
      console.log("AUTO-SELECTING Campaign 0");
      setSelectedCampaignId(0);
    }
  }, [selectedCampaignId, campaignCount]);

  const stage = campaign ? Number(campaign[4]) : 0;

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
    milestoneRequested: campaign[9] === true || campaign[9] === 1n || campaign[9] === 1 as any
  } : null;

  // DEBUG: Campaign State Tracking
  if (normalizedCampaign) {
    console.log("DEBUG: ReliefDAO Engine Sync", {
      stage: normalizedCampaign.stage,
      raw_stage: campaign[4]?.toString(),
      raw_active: campaign[5]?.toString(),
      raw_ngo: campaign[6]?.toString(),
      yes: normalizedCampaign.yesVotes,
      requested: normalizedCampaign.milestoneRequested
    });
  }


  // Handlers
  const handleCreateCampaign = async (name: string, target: string) => {
    if (!account || !signer) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const targetGoal = ethers.parseEther(target.toString());
      const tx = await contract.createCampaign(name, targetGoal);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      await readData();
      if (campaignCount !== null) {
        const newId = Number(campaignCount) > 0 ? Number(campaignCount) - 1 : 0;
        setSelectedCampaignId(newId);
      }
    } catch (e: unknown) {
      setError("Campaign creation failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDonate = async () => {
    if (!account || !signer || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const value = ethers.parseEther(donationAmount.toString());
      const tx = await contract.donate(selectedCampaignId, { value });
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await readData();
    } catch (e: unknown) {
      setError("Donation failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Shared helper: upload a file to Pinata and return its CID
  const uploadToPinata = async (file: File, metadata: object): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify(metadata));
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Pinata upload failed: ${res.statusText}`);
    const data = await res.json();
    return data.IpfsHash;
  };

  // Channel A: Live camera proof (geo-tagged, timestamp-checked)
  const handleUploadLiveProof = async () => {
    if (!liveFile || !account || !signer || selectedCampaignId === null) return;
    if (!gps.isReady || gps.lat === null || gps.lng === null) {
      setError("GPS not ready. Please wait for calibration to complete (< 500m accuracy).");
      return;
    }
    // Timestamp freshness check — must be captured within the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (liveFile.lastModified < fiveMinutesAgo) {
      setError("Proof must be captured live, not from history. Please take a new photo.");
      return;
    }
    setIsUploading(true);
    setUploadPhase("ipfs");
    setTxHash(null);
    setError(null);
    try {
      const cid = await uploadToPinata(liveFile, {
        name: `Campaign_${selectedCampaignId}_LiveProof`,
        keyvalues: {
          latitude: gps.lat!.toString(),
          longitude: gps.lng!.toString(),
          gps_accuracy: Math.round(gps.accuracy!).toString(),
          timestamp: new Date().toISOString(),
          type: "live_capture"
        }
      });
      setUploadPhase("chain");
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.submitProof(selectedCampaignId, cid, true);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setLiveFile(null);
      await readData();
    } catch (e: unknown) {
      setError("Live proof failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsUploading(false);
      setUploadPhase(null);
    }
  };

  // Channel B: Document / invoice upload (Now explicitly requires GPS as requested)
  const handleUploadDocument = async () => {
    if (!documentFile || !account || !signer || selectedCampaignId === null) return;
    if (!gps.isReady || gps.lat === null || gps.lng === null) {
      setError("GPS not ready. Documents must also be stamped with your location.");
      return;
    }
    setIsUploading(true);
    setUploadPhase("ipfs");
    setTxHash(null);
    setError(null);
    try {
      const cid = await uploadToPinata(documentFile, {
        name: `Campaign_${selectedCampaignId}_Document`,
        keyvalues: {
          type: "invoice",
          latitude: gps.lat.toString(),
          longitude: gps.lng.toString(),
          gps_accuracy: Math.round(gps.accuracy!).toString()
        }
      });
      setUploadPhase("chain");
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.submitProof(selectedCampaignId, cid, false);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setDocumentFile(null);
      setDocFileKey(k => k + 1);
      await readData();
    } catch (e: unknown) {
      setError("Document upload failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsUploading(false);
      setUploadPhase(null);
    }
  };

  const handleApprove = async () => {
    if (!account || !signer || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.approveMilestone(selectedCampaignId);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await readData();
    } catch (e: unknown) {
      setError("Approval failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsProcessing(false);
    }
  };
  const handleVote = async (support: boolean) => {
    if (!account || !signer || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.vote(selectedCampaignId, support);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await readData();
    } catch (e: any) {
      console.error("Voting failed:", e);
      setError(e.reason || e.message || "Voting failed");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleRequestMilestone = async () => {
    if (!account || !signer || selectedCampaignId === null) return;
    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.requestMilestoneRelease(selectedCampaignId);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await readData();
    } catch (e: unknown) {
      setError("Milestone request failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={theme.app}>


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
                <h3 style={{ fontSize: "1rem", margin: "0 0 1rem 0", textAlign: "center", color: "#94a3b8" }}>Metamask Authentication</h3>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={handleConnectMetamask}
                    style={{ ...theme.btn, marginTop: 0, fontSize: "0.9rem", padding: "0.75rem 2rem", background: "#f6851b", border: "none", color: "white", fontWeight: "bold" }}
                  >
                    🦊 Connect MetaMask
                  </button>
                </div>
                <p style={{ fontSize: "0.7rem", color: "#475569", marginTop: "1rem", textAlign: "center" }}>Please ensure MetaMask points to Hardhat (127.0.0.1:8545)</p>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={theme.badge && { background: "#059669", color: "white", padding: "0.4rem 1rem", borderRadius: "2rem", fontSize: "0.8rem", fontWeight: "bold" }}>
                  CONNECTED VIA METAMASK
                </div>
              </div>
            )}
          </div>
        </header>

        {account && (
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            {/* ROLE SELECTION */}
            {!role ? (
              <div style={{ padding: "1.5rem", background: "#1e293b", borderRadius: "1rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Select Your Role</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <button onClick={() => setRole("donor")} style={{ ...theme.btn, background: "#3b82f6", marginTop: 0 }}>I am a Donor</button>
                  <button onClick={() => setRole("ngo")} style={{ ...theme.btn, background: "#10b981", marginTop: 0 }}>I am an NGO</button>
                  <button onClick={() => setRole("beneficiary")} style={{ ...theme.btn, background: "#8b5cf6", marginTop: 0 }}>Beneficiary</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={theme.badge && { background: role === "beneficiary" ? "#8b5cf6" : role === "donor" ? "#3b82f6" : "#10b981", color: "white", padding: "0.2rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontWeight: "bold" }}>
                    ROLE: {role.toUpperCase()}
                  </div>
                  
                  {/* 🛠️ GLOBAL SYSTEM DEBUG RIBBON */}
                  <div style={{ marginLeft: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "0.4rem", background: "rgba(2, 6, 23, 0.8)", border: "1px solid #334155", color: "#94a3b8", fontSize: "0.65rem", display: "flex", gap: "1rem", fontFamily: "monospace" }}>
                    <span>STAGE: <b>{stage}</b></span>
                    <span>RQST: <b>{normalizedCampaign?.milestoneRequested ? "YES" : "NO"}</b></span>
                    <span>YES: <b>{normalizedCampaign?.yesVotes || 0}</b></span>
                  </div>

                  <button onClick={() => { setRole(null); setSelectedCampaignId(null); }} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.75rem" }}>Change Role</button>
                </div>

                {role === "beneficiary" ? (
                  <BeneficiaryView
                    campaignCount={Number(campaignCount || 0)}
                    selectedCampaignId={selectedCampaignId}
                    setSelectedCampaignId={setSelectedCampaignId}
                    campaign={normalizedCampaign} 
                    proofs={proofs}
                    donations={donations}
                    hasVoted={hasVoted}
                    onVote={handleVote}
                    isProcessing={isProcessing}
                  />
                ) : role === "donor" ? (
                  <DonorView
                    campaignCount={Number(campaignCount || 0)}
                    selectedCampaignId={selectedCampaignId}
                    setSelectedCampaignId={setSelectedCampaignId}
                    campaign={normalizedCampaign} 
                    proofs={proofs} 
                    donations={donations}
                    donationAmount={donationAmount}
                    setDonationAmount={setDonationAmount}
                    onDonate={handleDonate}
                    isProcessing={isProcessing}
                  />
                ) : (
                  <NGOView
                    campaignCount={Number(campaignCount || 0)}
                    selectedCampaignId={selectedCampaignId}
                    setSelectedCampaignId={setSelectedCampaignId}
                    onCreateCampaign={handleCreateCampaign}
                    stage={stage}
                    campaign={normalizedCampaign}
                    donations={donations}
                    onLiveFileSelect={setLiveFile}
                    onDocumentFileSelect={setDocumentFile}
                    onUploadLiveProof={handleUploadLiveProof}
                    onUploadDocument={handleUploadDocument}
                    onApprove={handleApprove}
                    onRequestMilestone={handleRequestMilestone}
                    onRefresh={readData}
                    isUploading={isUploading}
                    uploadPhase={uploadPhase}
                    isProcessing={isProcessing}
                    hasLiveFile={!!liveFile}
                    hasDocumentFile={!!documentFile}
                    docFileKey={docFileKey}
                    gps={gps}
                    proofs={proofs}
                  />
                )}

                <AccountInfo
                  address={account}
                  provider={provider}
                  onLogout={disconnect}
                />
              </>
            )}
          </div>
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

        {readError && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#7c2d12", borderRadius: "0.75rem", color: "#fdba74", fontSize: "0.8rem", textAlign: "center", border: "1px solid #9a3412" }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>⚠️ Contract Sync Issue</div>
            Failed to read from contract. Please ensure you have <b>redeployed</b> the contract and updated the address in <code>contract.ts</code>.
            <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", opacity: 0.8 }}>{readError.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
