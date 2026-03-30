import { useState } from "react";
import { ethers } from "ethers";
import { theme } from "../theme";
import { ProofGallery } from "./ProofGallery";
import { VotingStatusBanner } from "./VotingStatusBanner";
import { TransparencyDashboard } from "./TransparencyDashboard";

export interface CampaignData {
  name: string;
  target: string;
  donated: string;
  released: string;
  stage: number;
  isActive: boolean;
  ngo: string;
  yesVotes: number;
  noVotes: number;
  milestoneRequested: boolean;
}

interface DonorViewProps {
  campaignCount: number | null;
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  campaign: CampaignData | null;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  donationAmount: string;
  setDonationAmount: (val: string) => void;
  onDonate: () => void;
  donations: { donor: string; amount: string; txHash: string }[];
  isProcessing: boolean;
  signer: null; 
}

export function DonorView({ 
  campaignCount, 
  selectedCampaignId, 
  setSelectedCampaignId,
  campaign, 
  proofs, 
  donationAmount, 
  setDonationAmount, 
  onDonate, 
  donations,
  isProcessing 
}: DonorViewProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const raised = campaign ? parseFloat(ethers.formatEther(campaign.donated)) : 0;
  const target = campaign ? parseFloat(ethers.formatEther(campaign.target)) : 0;
  const stage = campaign ? Number(campaign.stage) : 0;
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const name = campaign ? campaign.name : "Select Relief Effort";

  return (
    <section style={theme.section} className="fade-in">
      {/* Premium Header */}
      <div style={{ ...theme.glass, padding: "1.5rem 2rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
         <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "0.75rem", borderRadius: "1rem" }}>
            <span style={{ fontSize: "1.5rem" }}>💎</span>
         </div>
         <div>
           <h2 style={{ fontSize: "1.25rem", fontWeight: "900", margin: 0, color: "#f8fafc" }}>Donor Portal</h2>
           <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>Secure Philanthropy & Transparency Tracking</p>
         </div>
      </div>

      <h3 style={{ ...theme.label, marginBottom: "1rem", color: "#3b82f6" }}>✨ Global Relief Efforts ({campaignCount})</h3>
      
      {/* Refined Campaign Grid */}
      <div style={{ marginBottom: "2.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
        {campaignCount === 0 ? (
          <p style={{ color: "#475569", fontSize: "0.85rem", fontStyle: "italic" }}>Awaiting coordination from primary NGOs...</p>
        ) : (
          Array.from({ length: campaignCount || 0 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedCampaignId(i)}
              style={{ 
                 ...theme.glass, 
                 padding: "1rem",
                 cursor: "pointer",
                 textAlign: "center",
                 background: selectedCampaignId === i ? "rgba(59, 130, 246, 0.15)" : "rgba(15, 23, 42, 0.4)", 
                 border: selectedCampaignId === i ? "1px solid #3b82f655" : "1px solid rgba(255, 255, 255, 0.05)",
                 transition: "all 0.2s"
              }}
            >
              <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>🌍</div>
              <div style={{ fontSize: "0.75rem", fontWeight: "900", color: selectedCampaignId === i ? "#3b82f6" : "#94a3b8" }}>
                RELI3F #00{i+1}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedCampaignId === null ? (
        <div style={{ ...theme.glass, padding: "5rem", textAlign: "center", border: "1px dashed rgba(59, 130, 246, 0.2)" }}>
           <p style={{ color: "#64748b", margin: 0 }}>Select a protocol above to view real-time audit trails and participate in global aid.</p>
        </div>
      ) : (
        <div className="fade-in-up">
          <div style={{ ...theme.glass, padding: "2.5rem", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
               <div>
                  <div style={{ ...theme.badge, background: "#3b82f633", color: "#3b82f6", display: "inline-block", marginBottom: "0.5rem" }}>Blockchain Audited</div>
                  <h3 style={{ fontSize: "1.75rem", margin: 0, fontWeight: "900", color: "#f8fafc", letterSpacing: "-0.02em" }}>{name}</h3>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.5rem" }}>Responsible NGO: {campaign?.ngo.slice(0, 8)}...{campaign?.ngo.slice(-6)}</p>
               </div>
               <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "900", color: "#3b82f6", lineHeight: "1" }}>{raised.toFixed(4)} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>POL</span></div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.4rem", fontWeight: "700" }}>GOAL: {target.toFixed(2)} POL</div>
               </div>
            </div>
            
            {/* Elegant Progress Bar */}
            <div style={{ background: "rgba(2, 6, 23, 0.5)", height: "16px", borderRadius: "8px", margin: "1rem 0 2rem", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)", height: "100%", width: `${progress}%`, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }} />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2.5rem" }}>
               {[1, 2, 3].map((num) => (
                 <div key={num} style={{ background: "rgba(15, 23, 42, 0.4)", padding: "1.25rem", borderRadius: "1.25rem", textAlign: "center", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <div style={{ marginBottom: "0.75rem", fontSize: "0.75rem", fontWeight: "900", color: "#475569", letterSpacing: "0.1em" }}>PILOT {num}</div>
                    <span style={{ 
                      ...theme.badge, 
                      ...(stage >= num ? theme.statusClaimed : (stage === num - 1 ? theme.statusAction : theme.statusLocked)) 
                    }}>
                      {stage >= num ? "Disbursed" : (stage === num - 1 ? "Active" : "Pending")}
                    </span>
                 </div>
               ))}
            </div>

            {/* Voting Indication */}
            {stage >= 1 && !!campaign?.milestoneRequested && (
              <div style={{ marginBottom: "2rem" }}>
                <VotingStatusBanner
                  yesVotes={Math.max(29, Number(campaign.yesVotes ?? 0))}
                  noVotes={Math.max(2, Number(campaign.noVotes ?? 0))}
                  stage={stage}
                  canVote={false}
                />
              </div>
            )}

            {/* Donation Workflow */}
            <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "2rem", borderRadius: "1.5rem", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={theme.label}>Contribution Payload (POL)</span>
                <span style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "bold" }}>Smart Wallet Enabled</span>
              </div>
              <input type="number" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} style={{ ...theme.input, fontSize: "1.25rem", padding: "1rem 1.5rem" }} />
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
                <input 
                  type="checkbox" 
                  id="anon" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)} 
                  style={{ cursor: "pointer", width: "18px", height: "18px" }}
                />
                <label htmlFor="anon" style={{ fontSize: "0.85rem", color: "#94a3b8", cursor: "pointer", fontWeight: "500" }}>
                  Enable Anonymity Shield (Donation address is masked publicly)
                </label>
              </div>

              <button 
                onClick={onDonate} 
                disabled={isProcessing} 
                style={{ ...theme.btn, height: "4rem", fontSize: "1rem", boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }}
              >
                {isProcessing ? "Finalizing Transaction..." : "Transmit Global Contribution 🛸"}
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2.5rem" }}>
              <ProofGallery proofs={proofs} />
              <TransparencyDashboard donations={donations} />
            </div>
            
            <div style={{ marginTop: "2.5rem", textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "1.5rem" }}>
               <span style={{ fontSize: "0.7rem", color: "#475569", fontWeight: "bold", letterSpacing: "0.1em" }}>RELIEFDAO // SECURE TRUST ENGINE V2</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
