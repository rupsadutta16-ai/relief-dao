import { useState, useRef } from "react";
import { theme } from "../theme";
import { ethers } from "ethers";
import type { GeoState } from "../hooks/useGeoCalibration";
import { ProofGallery } from "./ProofGallery";
import { CameraCapture } from "./CameraCapture";
import type { CampaignData } from "./DonorView";
import { VotingStatusBanner } from "./VotingStatusBanner";
import { TransparencyDashboard } from "./TransparencyDashboard";

interface NGOViewProps {
  campaignCount: number;
  selectedCampaignId: number | null;
  setSelectedCampaignId: (id: number | null) => void;
  onCreateCampaign: (name: string, target: string) => void;
  campaign: CampaignData | null;
  onUploadProof: (file: File, isLive: boolean) => Promise<void>;
  onApprove: () => void;
  onRequestMilestone: () => void;
  isProcessing: boolean;
  gps: GeoState;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  donations: { donor: string; amount: string; txHash: string }[];
}

export function NGOView({
  campaignCount,
  selectedCampaignId,
  setSelectedCampaignId,
  onCreateCampaign,
  campaign,
  onUploadProof,
  onApprove,
  onRequestMilestone,
  isProcessing,
  gps,
  proofs,
  donations
}: NGOViewProps) {
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("1.0");
  const [showCreate, setShowCreate] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stage = campaign ? Number(campaign.stage) : 0;

  console.info(`[DEEP_DEBUG_UI] NGOView received proofs:`, proofs?.length || 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("[UI_EVENT] File selected:", file.name);
      await onUploadProof(file, false);
    }
  };

  return (
    <section style={theme.section} className="fade-in">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        onChange={handleFileChange}
        accept="image/*,application/pdf"
      />

      {showCamera && (
        <CameraCapture
          onCapture={async (file) => {
            if (!file) return;
            console.log("[UI_EVENT] Photo captured");
            await onUploadProof(file, true);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Glass Header for NGO Dashboard */}
      <div style={{ ...theme.glass, padding: "1.5rem 2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.75rem", borderRadius: "1rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🏗️</span>
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "900", margin: 0, color: "#f8fafc" }}>NGO Workspace</h2>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>Protocol Manager & Evidence Submission</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ ...theme.btn, marginTop: 0, width: "auto", background: showCreate ? "#334155" : "linear-gradient(135deg, #10b981, #059669)", padding: "0.6rem 1.25rem" }}
        >
          {showCreate ? "Cancel Launch" : "+ Launch New Relief"}
        </button>
      </div>

      {showCreate && (
        <div style={{ ...theme.glass, background: "rgba(16, 185, 129, 0.05)", padding: "2rem", marginBottom: "2.5rem", border: "1px dashed rgba(16, 185, 129, 0.3)" }}>
          <h3 style={{ fontSize: "1rem", color: "#10b981", marginBottom: "1.5rem", fontWeight: "800" }}>🚀 Initialize New Relief Protocol</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <span style={theme.label}>Campaign Name</span>
              <input
                placeholder="e.g. Assam Flood Relief"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={theme.input}
              />
            </div>
            <div>
              <span style={theme.label}>Target Goal (POL)</span>
              <input
                type="number"
                step="0.1"
                placeholder="10.0"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                style={theme.input}
              />
            </div>
          </div>
          <button
            onClick={() => { onCreateCampaign(newName, newTarget); setShowCreate(false); }}
            disabled={isProcessing || !newName}
            style={{ ...theme.btn, background: "linear-gradient(135deg, #10b981, #059669)", height: "3.5rem" }}
          >
            {isProcessing ? "Deploying Smart Contract..." : "Register Global Protocol"}
          </button>
        </div>
      )}

      {/* Campaign Selection Dropdown */}
      <div style={{ ...theme.glass, padding: "1rem", marginBottom: "2rem", display: "flex", gap: "1rem" }}>
          <select
            value={selectedCampaignId ?? ""}
            onChange={(e) => setSelectedCampaignId(e.target.value === "" ? null : Number(e.target.value))}
            style={{ ...theme.input, margin: 0, flex: 1, padding: "0.6rem 1rem", background: "transparent", border: "none" }}
          >
            <option value="">-- Direct Access ({campaignCount} Active Projects) --</option>
            {Array.from({ length: campaignCount || 0 }).map((_, i) => (
              <option key={i} value={i} style={{ background: "#0f172a" }}>Campaign #00{i+1} ({i === 0 ? "abcde" : `Protocol #${i}`})</option>
            ))}
          </select>
          <button
            onClick={() => window.location.reload()}
            style={{ ...theme.btn, marginTop: 0, width: "auto", background: "#1e293b", padding: "0 1rem" }}
            title="Force Blockchain Re-sync"
          >
            🔄
          </button>
      </div>

      {campaignCount === 0 && !showCreate && (
        <div style={{ ...theme.glass, padding: "4rem", textAlign: "center" }}>
           <p style={{ color: "#64748b", margin: 0 }}>No active relief protocols detected in your registry.</p>
           <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: "0.5rem" }}>Launch a new campaign above to begin fund disbursement.</p>
        </div>
      )}

      {selectedCampaignId !== null && campaign && (
        <div className="fade-in-up">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
            <div>
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
                 <span style={{ ...theme.badge, background: "#10b98133", color: "#10b981" }}>Active Relief</span>
                 <span style={{ ...theme.badge, background: "#3b82f633", color: "#3b82f6" }}>v2 Protocol</span>
              </div>
              <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>{campaign.name}</h1>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.4rem" }}>Registry: <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{campaign.ngo}</span></p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase" }}>Total Contributed</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#10b981", lineHeight: "1" }}>{parseFloat(ethers.formatEther(campaign.donated)).toFixed(2)} <span style={{ fontSize: "1rem", color: "#64748b" }}>POL</span></div>
              <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.5rem" }}>Project Baseline: {ethers.formatEther(campaign.target)} POL</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "2rem", alignItems: "start" }}>
            <div style={{ ...theme.glass, padding: "2rem" }}>
              <h3 style={{ ...theme.label, marginBottom: "1.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>Milestone Disbursement Pipeline</span>
                <span style={{ color: "#10b981" }}>Current Phase: {stage}</span>
              </h3>
              
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem", position: "relative" }}>
                {[0, 1, 2].map((s) => (
                  <div key={s} style={{ flex: 1 }}>
                    <div 
                      style={{ 
                        height: "10px", 
                        borderRadius: "5px", 
                        background: s <= stage ? "linear-gradient(90deg, #10b981, #059669)" : "#1e293b",
                        boxShadow: s === stage ? "0 0 20px rgba(16, 185, 129, 0.4)" : "none",
                        transition: "all 0.5s ease"
                      }} 
                    />
                    <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", fontWeight: "900", color: s <= stage ? "#10b981" : "#475569", textAlign: "center" }}>
                      PHASE {s+1}
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION CENTER */}
              <div style={{ background: "rgba(2, 6, 23, 0.4)", borderRadius: "1.25rem", padding: "2rem", border: "1px solid #1e293b" }}>
                {stage === 0 && (
                  <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid #1e293b" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem", color: "#3b82f6", fontWeight: "900" }}>🔓 Emergency Startup Tranche</h4>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.5rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                      Release the initial 10% of funds for mobilization. Requires 10% funding gate.
                    </p>
                    <button 
                      onClick={onApprove} 
                      disabled={isProcessing || BigInt(campaign.donated) < BigInt(campaign.target) / 10n}
                      style={{ 
                        ...theme.btn, 
                        marginTop: 0, 
                        height: "4rem",
                        background: BigInt(campaign.donated) < BigInt(campaign.target) / 10n ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                        opacity: BigInt(campaign.donated) < BigInt(campaign.target) / 10n ? 0.5 : 1
                      }}
                    >
                      {isProcessing ? "Authorizing Smart Wallet..." : 
                       BigInt(campaign.donated) < BigInt(campaign.target) / 10n ? "Waiting for 10% Goal..." : "Disburse Startup Funds"}
                    </button>
                  </div>
                )}

                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#10b981", fontWeight: "900" }}>📸 Milestone Proof Submission</h4>
                  
                  {campaign.milestoneRequested ? (
                    <VotingStatusBanner 
                      yesVotes={Number(campaign.yesVotes)} 
                      noVotes={Number(campaign.noVotes)} 
                      stage={stage}
                    />
                  ) : (
                    <>
                      <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.5rem", marginBottom: "1.5rem" }}>
                        Submit photographic evidence and documentation to verify activities and request fund releases.
                      </p>
                      {isProcessing && (
                        <div style={{ textAlign: "center", padding: "1rem", color: "#3b82f6", fontSize: "0.75rem", fontWeight: "bold" }}>
                           PROTOCOL BUSY: COMMITING DATA...
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                        <button 
                          onClick={() => { console.log("[BTN_CLICK] Camera"); setShowCamera(true); }} 
                          style={{ ...theme.btn, marginTop: 0, background: "#1e293b", fontSize: "0.85rem", opacity: isProcessing ? 0.5 : 1 }}
                        >📸 Photo Proof</button>
                        <button 
                          onClick={() => { console.log("[BTN_CLICK] File"); fileInputRef.current?.click(); }} 
                          style={{ ...theme.btn, marginTop: 0, background: "#1e293b", fontSize: "0.85rem", opacity: isProcessing ? 0.5 : 1 }}
                        >📄 Logistic Document</button>
                      </div>

                      <div style={{ padding: "1.25rem", background: "#020617", borderRadius: "1rem", marginBottom: "1.5rem", border: "1px solid #1e293b" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={theme.label}>🛰️ Calibration Status</span>
                          <span style={{ fontSize: "0.75rem", color: gps.isReady ? "#10b981" : "#f59e0b", fontWeight: "900" }}>
                            {gps.isReady ? "VERIFIED" : "SYNCING..."}
                          </span>
                        </div>
                        <div style={{ color: "#f8fafc", fontSize: "0.85rem", marginTop: "0.5rem", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                          <span>{gps.isReady ? `LAT: ${gps.lat?.toFixed(6)} | LNG: ${gps.lng?.toFixed(6)}` : "Acquiring GPS Signal..."}</span>
                          {gps.isReady && (
                            <span style={{ color: "#94a3b8" }}>ACCURACY: ±{gps.accuracy?.toFixed(1)}m</span>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={onRequestMilestone} 
                        disabled={isProcessing || !gps.isReady || (proofs?.length || 0) === 0}
                        style={{ 
                          ...theme.btn, 
                          marginTop: 0, 
                          height: "4rem",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          opacity: (!isProcessing && gps.isReady && (proofs?.length || 0) > 0) ? 1 : 0.5
                        }}
                      >
                        {isProcessing ? "Finalizing Submission..." : 
                         !gps.isReady ? "Calibrating Sensors..." : 
                         (proofs?.length || 0) === 0 ? "Evidence Required" : "Request Fund Release"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SIDEBAR DASHBOARDS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <ProofGallery proofs={proofs} />
              <TransparencyDashboard donations={donations} />
            </div>
          </div>
          <div style={{ marginTop: "2rem", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "1.5rem" }}>
             <span style={{ fontSize: "0.7rem", color: "#475569", fontWeight: "900", letterSpacing: "0.1em" }}>RELIEFDAO // SECURE PROT0C0L V2.0</span>
          </div>
        </div>
      )}
    </section>
  );
}
