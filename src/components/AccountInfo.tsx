import { useWalletBalance } from "thirdweb/react";
import { client, chain } from "../contract"; // Import from contract to stay synced with Amoy
import { theme } from "../theme";

interface AccountInfoProps {
  address: string;
  onDisconnect: () => void;
}

export function AccountInfo({ address, onDisconnect }: AccountInfoProps) {
  const { data: balanceData, isLoading } = useWalletBalance({
    client,
    chain,
    address,
  });

  return (
    <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={theme.label}>Active Wallet</span>
        <button 
          onClick={onDisconnect} 
          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}
        >
          Logout
        </button>
      </div>
      <div style={{ ...theme.input, fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.4rem", fontFamily: "monospace", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{address}</span>
        <span style={{ color: "#4ade80", fontWeight: "bold", marginLeft: "1rem", whiteSpace: "nowrap" }}>
          {isLoading ? "..." : `${parseFloat(balanceData?.displayValue || "0").toFixed(4)} ${balanceData?.symbol || "ETH"}`}
        </span>
      </div>
    </div>
  );
}
