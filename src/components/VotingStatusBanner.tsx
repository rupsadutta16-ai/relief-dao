/**
 * Shared read-only voting tally banner. Shown across all roles when milestoneRequested is true.
 */
interface VotingStatusBannerProps {
  yesVotes: number;
  noVotes: number;
  stage: number;
  canVote?: boolean; // Only Beneficiary role passes true
}

export function VotingStatusBanner({ yesVotes, noVotes, stage, canVote = false }: VotingStatusBannerProps) {
  const totalVotes = yesVotes + noVotes;
  const approvalPct = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

  return (
    <div style={{ marginTop: "1.25rem", background: "linear-gradient(135deg, #1e1b4b22, #0f172a)", border: "1px solid #6d28d9", borderRadius: "1rem", padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>🗳️</span>
          <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#c4b5fd" }}>Beneficiary Vote in Progress</span>
        </div>
        <span style={{ padding: "0.15rem 0.6rem", borderRadius: "2rem", background: "#7c3aed33", border: "1px solid #7c3aed", color: "#a78bfa", fontSize: "0.65rem", fontWeight: "bold" }}>
          STAGE {stage} UNLOCK
        </span>
      </div>

      {/* Live Tally */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ background: "#064e3b33", border: "1px solid #065f46", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginBottom: "0.2rem" }}>YES VOTES</div>
          <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#4ade80" }}>{yesVotes}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginBottom: "0.2rem" }}>TOTAL CAST</div>
          <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#f8fafc" }}>{totalVotes}</div>
        </div>
        <div style={{ background: "#45041333", border: "1px solid #7f1d1d", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginBottom: "0.2rem" }}>NO VOTES</div>
          <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#f87171" }}>{noVotes}</div>
        </div>
      </div>

      {/* Progress to 30 */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#94a3b8", marginBottom: "0.35rem" }}>
          <span>Votes toward 30 YES threshold</span>
          <span style={{ color: "#4ade80" }}>{yesVotes}/30 ({approvalPct}% approval)</span>
        </div>
        <div style={{ background: "#1e293b", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(90deg, #22c55e, #4ade80)", height: "100%", width: `${Math.min((yesVotes / 30) * 100, 100)}%`, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Timer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "0.5rem 0.75rem", borderRadius: "0.5rem" }}>
        <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Auto-release in:</span>
        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "bold", color: "#fbbf24" }}>71h 52m 14s</span>
      </div>

      {!canVote && (
        <p style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.65rem", color: "#64748b", textAlign: "center" }}>
          Voting is restricted to registered beneficiaries. This view is read-only.
        </p>
      )}
    </div>
  );
}
