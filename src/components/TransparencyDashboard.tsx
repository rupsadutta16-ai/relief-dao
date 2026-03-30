interface Donation {
  donor: string;
  amount: string;
  txHash: string;
}

interface TransparencyDashboardProps {
  donations: Donation[];
}

export function TransparencyDashboard({ donations }: TransparencyDashboardProps) {
  return (
    <div style={{ marginTop: "2rem", borderTop: "1px solid #1e293b", paddingTop: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.2rem" }}>💎</span>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>Donation Ledger (On-Chain)</h3>
      </div>

      {donations.length === 0 ? (
        <div style={{ padding: "1rem", background: "#0f172a", borderRadius: "0.75rem", border: "1px dashed #334155", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
          No donations recorded yet for this campaign.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {donations.map((d, i) => (
            <div key={i} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#3b82f6", fontFamily: "monospace" }}>
                  {d.donor.slice(0, 6)}...{d.donor.slice(-4)}
                </span>
                <span style={{ fontSize: "0.6rem", color: "#475569" }}>
                  TX: {d.txHash.slice(0, 10)}...
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1rem", fontWeight: "900", color: "#4ade80" }}>
                  {d.amount} <span style={{ fontSize: "0.7rem", color: "#64748b" }}>ETH</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
