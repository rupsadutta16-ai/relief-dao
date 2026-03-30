import { theme } from "../theme";
import { VotingStatusBanner } from "./VotingStatusBanner";
import { ProofGallery } from "./ProofGallery";
import { TransparencyDashboard } from "./TransparencyDashboard";
import type { CampaignData } from "./DonorView";
import { ethers } from "ethers";

interface BeneficiaryViewProps {
  campaignCount: number | null;
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  campaign: CampaignData | null;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  donations: { donor: string; amount: string; txHash: string }[];
  hasVoted: boolean;
  onVote: (support: boolean) => void;
  isProcessing: boolean;
  account: string;
  signer?: any;
}

export function BeneficiaryView({
  campaignCount,
  selectedCampaignId,
  setSelectedCampaignId,
  campaign,
  proofs,
  donations,
  hasVoted,
  onVote,
  isProcessing
}: BeneficiaryViewProps) {

  const stage = campaign ? Number(campaign.stage) : 0;

  return (
    <section style={theme.section} className="fade-in">
      {/* Premium Hub Header */}
      <div style={{ ...theme.glass, padding: "1.5rem 2rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
         <div style={{ background: "rgba(139, 92, 246, 0.1)", padding: "0.75rem", borderRadius: "1rem" }}>
            <span style={{ fontSize: "1.5rem" }}>⚖️</span>
         </div>
         <div>
           <h2 style={{ fontSize: "1.25rem", fontWeight: "900", margin: 0, color: "#f8fafc" }}>Beneficiary Hub</h2>
           <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>Community Governance & Milestone Verification</p>
         </div>
      </div>

      <h3 style={{ ...theme.label, marginBottom: "1rem", color: "#8b5cf6" }}>🏛️ Governance Registry ({campaignCount})</h3>

      {/* Campaign Selector with Glass Style */}
      <div style={{ ...theme.glass, padding: "1rem", marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <select
          value={selectedCampaignId ?? ""}
          onChange={(e) => setSelectedCampaignId(e.target.value === "" ? null : Number(e.target.value))}
          style={{ ...theme.input, margin: 0, flex: 1, padding: "0.6rem 1rem", background: "transparent", border: "none" }}
        >
          <option value="">-- Active Community Projects ({campaignCount}) --</option>
          {Array.from({ length: campaignCount || 0 }).map((_, i) => (
            <option key={i} value={i} style={{ background: "#0f172a" }}>Governance ID #00{i+1}</option>
          ))}
        </select>
      </div>

      {campaignCount === 0 && (
         <div style={{ ...theme.glass, padding: "4rem", textAlign: "center" }}>
           <p style={{ color: "#64748b", margin: 0 }}>No community protocols registered for audit.</p>
         </div>
      )}

      {selectedCampaignId !== null && campaign && (
        <div className="fade-in-up">
          <div style={{ ...theme.glass, padding: "2rem", marginBottom: "2rem", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
            <div className="mobile-stack" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <div>
                  <div style={{ ...theme.badge, background: "#8b5cf633", color: "#8b5cf6", display: "inline-block", marginBottom: "0.5rem" }}>Community Governed</div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.02em" }}>{campaign.name}</h3>
                  <div className="mobile-stack" style={{ fontSize: "0.85rem", color: "#94a3b8", display: "flex", gap: "1.5rem" }}>
                    <span style={{ color: campaign.isActive ? "#10b981" : "#ef4444" }}>
                      ● {campaign.isActive ? "Protocol Active" : "Finalized"}
                    </span>
                    <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
                      🛰️ You're within 3km radius
                    </span>
                  </div>
               </div>
               <div className="mobile-text-center" style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "900", textTransform: "uppercase" }}>Disbursed Funds</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: "900", color: "#8b5cf6" }}>{parseFloat(ethers.formatEther(campaign.released || "0")).toFixed(2)} POL</div>
               </div>
            </div>
          </div>

          <div className="responsive-grid columns-2" style={{ alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Voting Action Area */}
                {stage >= 1 && campaign.milestoneRequested ? (
                  <div style={{ ...theme.glass, border: "1px solid rgba(139, 92, 246, 0.4)", overflow: "hidden" }}>
                    <div style={{ background: "rgba(139, 92, 246, 0.05)", padding: "1.5rem 2rem", borderBottom: "1px solid rgba(139, 92, 246, 0.1)" }}>
                       <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#a78bfa", fontWeight: "900" }}>🗳️ Governance Ballot Open</h4>
                       <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.25rem 0 0 0" }}>Final verification for Stage {stage} funds.</p>
                    </div>
                    <div style={{ padding: "1.5rem 2rem" }}>
                      <VotingStatusBanner
                        yesVotes={Number(campaign.yesVotes)}
                        noVotes={Number(campaign.noVotes)}
                        onVote={onVote}
                        hasVoted={hasVoted}
                        isProcessing={isProcessing}
                        stage={stage}
                        canVote={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ ...theme.glass, padding: "3rem", textAlign: "center", border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#f8fafc" }}>Awaiting Proof Milestone</div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>The NGO must submit evidence and request a release before the community can vote.</p>
                  </div>
                )}
                
                <ProofGallery proofs={proofs} />
            </div>

            <TransparencyDashboard donations={donations} />
          </div>

          <div style={{ marginTop: "2.5rem", textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "1.5rem" }}>
               <span style={{ fontSize: "0.7rem", color: "#475569", fontWeight: "bold", letterSpacing: "0.1em" }}>RELIEFDAO // SECURE TRUST ENGINE V2</span>
          </div>
        </div>
      )}
    </section>
  );
}
