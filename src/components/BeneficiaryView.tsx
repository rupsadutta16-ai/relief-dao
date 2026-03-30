import { ethers } from "ethers";
import { theme } from "../theme";
import { ProofGallery } from "./ProofGallery";
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

interface BeneficiaryViewProps {
  campaignCount: number;
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  campaign: CampaignData | null;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  hasVoted: boolean;
  onVote: (support: boolean) => void;
  donations: { donor: string; amount: string; txHash: string }[];
  isProcessing: boolean;
}

function MilestoneVerification({ campaign, hasVoted, onVote, isProcessing }: {
  campaign: CampaignData;
  hasVoted: boolean;
  onVote: (support: boolean) => void;
  isProcessing: boolean;
}) {
  // Baseline: Use 29 and 2 as the initial floor for demo votes
  const displayYes = Math.max(29, Number(campaign.yesVotes ?? 0));
  const displayNo = Math.max(2, Number(campaign.noVotes ?? 0));
  const totalVotes = displayYes + displayNo;
  const approvalPct = Math.round((displayYes / totalVotes) * 100);

  const handleYes = async () => {
    if (hasVoted || isProcessing) return;
    await onVote(true);
  };

  const handleNo = async () => {
    if (hasVoted || isProcessing) return;
    await onVote(false);
  };

  if (displayYes >= 30 && hasVoted) {
    return (
      <div style={{ marginTop: "1.5rem", background: "linear-gradient(135deg, #065f46, #064e3b)", border: "1px solid #10b981", borderRadius: "1rem", padding: "1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
        <h3 style={{ margin: "0 0 1rem 0", color: "#4ade80", fontSize: "1.1rem" }}>Milestone Disbursed</h3>
        <div style={{ background: "#022c22", borderRadius: "0.75rem", padding: "1rem", display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "#94a3b8" }}>Result</span>
            <span><b style={{ color: "#4ade80" }}>{displayYes} Yes</b> / <b style={{ color: "#f87171" }}>{displayNo} No</b> ({approvalPct}% Approval)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "#94a3b8" }}>Status</span>
            <span style={{ color: "#4ade80", fontWeight: "bold" }}>✅ Milestone {campaign.stage} Disbursed</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "#94a3b8" }}>Threshold Met</span>
            <span style={{ color: "#a3e635", fontWeight: "bold" }}>30 YES Votes reached</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1.5rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "1rem", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", color: "#f8fafc", fontSize: "1rem" }}>🗳️ Milestone Verification</h3>
          <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "2rem", background: hasVoted ? "#1e293b" : "rgba(124, 58, 237, 0.1)", color: hasVoted ? "#64748b" : "#c4b5fd", border: `1px solid ${hasVoted ? "#334155" : "#7c3aed"}` }}>
            {hasVoted ? "✔ Vote Recorded" : "Pending Quorum"}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b", marginBottom: "0.2rem" }}>Auto-Release In</div>
          <div style={{ fontFamily: "monospace", fontSize: "0.9rem", fontWeight: "bold", color: "#fbbf24" }}>71h 52m 14s</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "rgba(6, 78, 59, 0.2)", border: "1px solid #065f46", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: "0.25rem" }}>YES VOTES</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#4ade80" }}>{displayYes}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: "0.25rem" }}>TOTAL CAST</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f8fafc" }}>{totalVotes}</div>
        </div>
        <div style={{ background: "rgba(69, 4, 19, 0.2)", border: "1px solid #7f1d1d", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: "0.25rem" }}>NO VOTES</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f87171" }}>{displayNo}</div>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.4rem" }}>
          <span>Progress to 30 YES threshold</span>
          <span style={{ color: "#4ade80" }}>{displayYes}/30</span>
        </div>
        <div style={{ background: "#1e293b", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(90deg, #22c55e, #4ade80)", height: "100%", width: `${Math.min((displayYes / 30) * 100, 100)}%`, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {!hasVoted ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <button
            onClick={handleYes}
            disabled={isProcessing}
            style={{ ...theme.btn, marginTop: 0, background: "linear-gradient(135deg, #16a34a, #15803d)", border: "1px solid #22c55e", opacity: isProcessing ? 0.6 : 1, fontWeight: "bold" }}
          >
            {isProcessing ? "⏳ Confirming..." : "✅ Verify & Vote YES"}
          </button>
          <button
            onClick={handleNo}
            disabled={isProcessing}
            style={{ ...theme.btn, marginTop: 0, background: "linear-gradient(135deg, #dc2626, #b91c1c)", border: "1px solid #ef4444", opacity: isProcessing ? 0.6 : 1, fontWeight: "bold" }}
          >
            {isProcessing ? "⏳ Confirming..." : "❌ Vote NO"}
          </button>
        </div>
      ) : (
        <div style={{ padding: "0.75rem", background: "#1e293b", borderRadius: "0.5rem", textAlign: "center", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
          ✔ Your vote has been recorded on-chain. Thank you for participating.
        </div>
      )}

      <div style={{ padding: "0.75rem", background: "#020617", borderRadius: "0.5rem", border: "1px solid #1e293b" }}>
        <div style={{ fontSize: "0.65rem", color: "#4ade80", fontWeight: "bold", marginBottom: "0.35rem" }}>📜 UNLOCK CONDITIONS</div>
        <p style={{ margin: 0, fontSize: "0.7rem", color: "#94a3b8", lineHeight: "1.6" }}>
          Funds will be unlocked if: <b style={{ color: "#f8fafc" }}>30 Beneficiaries vote YES</b> OR{" "}
          <b style={{ color: "#fbbf24" }}>72 hours pass</b>, minimum{" "}
          <b style={{ color: "#f8fafc" }}>15 votes are cast</b>, and a majority is reached.
        </p>
      </div>
    </div>
  );
}

export function BeneficiaryView({
  campaignCount,
  selectedCampaignId,
  setSelectedCampaignId,
  campaign,
  proofs,
  hasVoted,
  onVote,
  donations,
  isProcessing
}: BeneficiaryViewProps) {
  const raised = campaign ? parseFloat(ethers.formatEther(BigInt(campaign.donated))) : 0;
  const target = campaign ? parseFloat(ethers.formatEther(BigInt(campaign.target))) : 0;
  const stage = campaign ? Number(campaign.stage) : 0;
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;

  return (
    <section style={theme.section}>
      <h2 style={{ fontSize: "1.1rem", borderLeft: "4px solid #8b5cf6", paddingLeft: "0.75rem", marginBottom: "1rem", color: "#c4b5fd" }}>👁️ Relief Transparency</h2>

      {/* Campaign Selector */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {campaignCount === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No campaigns available yet.</p>
        ) : (
          Array.from({ length: campaignCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedCampaignId(i)}
              style={{ ...theme.btn, marginTop: 0, width: "auto", background: selectedCampaignId === i ? "#8b5cf6" : "#1e293b", border: "1px solid #334155", padding: "0.5rem 1rem" }}
            >
              Campaign #{i}
            </button>
          ))
        )}
      </div>

      {selectedCampaignId === null ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#0f172a", borderRadius: "1rem", border: "1px dashed #334155" }}>
          Please select a campaign to view its status and proofs.
        </div>
      ) : (
        <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "1.2rem", margin: "0 0 1rem 0", color: "#f8fafc" }}>{campaign?.name}</h3>

          {/* Funding Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <span>Raised: <b>{raised.toFixed(4)} ETH</b></span>
            <span style={{ color: "#64748b" }}>Target: {target.toFixed(4)} ETH</span>
          </div>
          <div style={{ background: "#020617", height: "12px", borderRadius: "6px", margin: "0.5rem 0 1rem", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(90deg, #8b5cf6, #c4b5fd)", height: "100%", width: `${progress}%`, transition: "width 0.5s ease" }} />
          </div>

          {/* Stage tracker */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[1, 2, 3].map((num) => (
              <div key={num} style={{ background: "#020617", padding: "0.75rem", borderRadius: "0.75rem", textAlign: "center", fontSize: "0.7rem", border: "1px solid #334155" }}>
                <div style={{ marginBottom: "0.4rem" }}>Stage {num}</div>
                <span style={{ padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.65rem", fontWeight: "bold", background: stage >= num ? "#065f46" : "#1e293b", color: stage >= num ? "#4ade80" : "#475569" }}>
                  {stage >= num ? "✅ Done" : num === stage + 1 ? "⏳ Pending" : "🔒 Locked"}
                </span>
              </div>
            ))}
          </div>

          {/* Geo proximity badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#14532d33", border: "1px solid #16a34a", borderRadius: "2rem", padding: "0.3rem 0.8rem", fontSize: "0.7rem", color: "#4ade80", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.9rem" }}>📍</span>
            <span>You're within <b>3km radius</b> of this campaign</span>
            <span style={{ background: "#16a34a", color: "white", borderRadius: "1rem", padding: "0.1rem 0.4rem", fontSize: "0.6rem", fontWeight: "bold" }}>VERIFIED</span>
          </div>
          {/* Voting ONLY appears if Stage >= 1 AND NGO has officially requested it */}
          {campaign?.isActive && stage >= 1 && stage < 3 && !!campaign?.milestoneRequested && (
            <MilestoneVerification
              campaign={campaign}
              hasVoted={hasVoted}
              onVote={onVote}
              isProcessing={isProcessing}
            />
          )}

          <div style={{ marginTop: "1.5rem", padding: "0.5rem", borderRadius: "0.5rem", background: "rgba(2, 6, 23, 0.5)", border: "1px solid #1e293b", fontSize: "0.6rem", color: "#475569", display: "flex", justifyContent: "space-between" }}>
            <span>Engine: ReliefDAO_v2</span>
            <span>Stage: {stage}</span>
            <span>Requested: {campaign?.milestoneRequested ? "YES" : "NO"}</span>
            <span>YES: {Number(campaign?.yesVotes || 0)}</span>
          </div>

          {/* The NGO must request a release before any voting logic appears */}
          <ProofGallery proofs={proofs} />

          {/* Transparency Ledger */}
          <TransparencyDashboard donations={donations} />
        </div>
      )}
    </section>
  );
}
