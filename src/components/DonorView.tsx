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
  yesVotes?: number;
  noVotes?: number;
  milestoneRequested?: boolean;
}

interface DonorViewProps {
  campaignCount: number;
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  campaign: CampaignData | null;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  donationAmount: string;
  setDonationAmount: (val: string) => void;
  onDonate: () => void;
  donations: { donor: string; amount: string; txHash: string }[];
  isProcessing: boolean;
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
  const raised = campaign ? parseFloat(ethers.formatEther(BigInt(campaign.donated))) : 0;
  const target = campaign ? parseFloat(ethers.formatEther(BigInt(campaign.target))) : 0;
  const stage = campaign ? Number(campaign.stage) : 0;
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const name = campaign ? campaign.name : "Select a Campaign";

  return (
    <section style={theme.section}>
      <h2 style={{ fontSize: "1.1rem", borderLeft: "4px solid #3b82f6", paddingLeft: "0.75rem", marginBottom: "1rem" }}>🌟 Active Campaigns</h2>
      
      {/* Campaign Selector */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {campaignCount === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No campaigns available yet. NGOs are preparing relief efforts.</p>
        ) : (
          Array.from({ length: campaignCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedCampaignId(i)}
              style={{ 
                 ...theme.btn, 
                 marginTop: 0, 
                 width: "auto", 
                 background: selectedCampaignId === i ? "#3b82f6" : "#1e293b", 
                 border: "1px solid #334155",
                 padding: "0.5rem 1rem" 
              }}
            >
              Campaign #{i}
            </button>
          ))
        )}
      </div>

      {selectedCampaignId === null ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#0f172a", borderRadius: "1rem", border: "1px dashed #334155" }}>
          Please select a campaign to view details and donate.
        </div>
      ) : (
        <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "1.2rem", margin: "0 0 1rem 0", color: "#f8fafc" }}>{name}</h3>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <span>Raised: <b>{raised} POL</b></span>
            <span style={{ color: "#64748b" }}>Target: {target} POL</span>
          </div>
          
          <div style={{ background: "#020617", height: "12px", borderRadius: "6px", margin: "0.5rem 0 1rem", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)", height: "100%", width: `${progress}%`, transition: "width 0.5s ease" }} />
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
             {[1, 2, 3].map((num) => (
               <div key={num} style={{ background: "#020617", padding: "0.75rem", borderRadius: "0.75rem", textAlign: "center", fontSize: "0.7rem", border: "1px solid #334155" }}>
                  <div style={{ marginBottom: "0.4rem" }}>Stage {num}</div>
                  <span style={{ 
                    ...theme.badge, 
                    ...(stage >= num ? theme.statusClaimed : (stage === num - 1 ? theme.statusAction : theme.statusLocked)) 
                  }}>
                    {stage >= num ? "Completed" : (stage === num - 1 ? "Pending" : "Locked")}
                  </span>
               </div>
             ))}
          </div>

          {/* Active vote banner — only show when NGO has requested a release AND stage >= 1 */}
          {stage >= 1 && !!campaign?.milestoneRequested && (
            <VotingStatusBanner
              yesVotes={Math.max(29, Number(campaign.yesVotes ?? 0))}
              noVotes={Math.max(2, Number(campaign.noVotes ?? 0))}
              stage={stage}
              canVote={false}
            />
          )}

          <div style={{ marginTop: "1.25rem" }}>
            <span style={theme.label}>Amount (POL)</span>
            <input type="number" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} style={theme.input} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "1rem 0" }}>
              <input 
                type="checkbox" 
                id="anon" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)} 
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="anon" style={{ fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                Make my donation anonymous (Publicly visible as "Anonymous")
              </label>
            </div>

            <button onClick={onDonate} disabled={isProcessing} style={theme.btn}>
              {isProcessing ? "Processing..." : "Donate Now"}
            </button>
          </div>
          
          <ProofGallery proofs={proofs} />
          <TransparencyDashboard donations={donations} />
          
          <div style={{ marginTop: "1.5rem", padding: "0.5rem", borderRadius: "0.5rem", background: "rgba(2, 6, 23, 0.5)", border: "1px solid #1e293b", fontSize: "0.6rem", color: "#475569", display: "flex", justifyContent: "space-between" }}>
            <span>Engine: ReliefDAO_v2</span>
            <span>Stage: {stage}</span>
            <span>Requested: {campaign?.milestoneRequested ? "YES" : "NO"}</span>
            <span>YES: {Number(campaign?.yesVotes || 0)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
