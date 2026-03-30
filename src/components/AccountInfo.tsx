import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { theme } from "../theme";

interface AccountInfoProps {
  address: string;
  provider: ethers.BrowserProvider | null;
  onLogout: () => void;
}

export function AccountInfo({ address, provider, onLogout }: AccountInfoProps) {
  const [balance, setBalance] = useState<string>("0.0");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchBalance = async () => {
      if (!provider) return;
      try {
        const bal = await provider.getBalance(address);
        if (active) {
          setBalance(ethers.formatEther(bal));
        }
      } catch (e) {
        console.error("Failed to fetch balance", e);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    
    fetchBalance();
    
    // Poll for balance every 5 seconds
    const interval = setInterval(fetchBalance, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [address, provider]);

  return (
    <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={theme.label}>Active Wallet</span>
        <button 
          onClick={onLogout} 
          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}
        >
          Logout
        </button>
      </div>
      <div style={{ ...theme.input, fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.4rem", fontFamily: "monospace", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{address}</span>
        <span style={{ color: "#4ade80", fontWeight: "bold", marginLeft: "1rem", whiteSpace: "nowrap" }}>
          {isLoading ? "..." : `${parseFloat(balance).toFixed(4)} ETH`}
        </span>
      </div>
    </div>
  );
}
