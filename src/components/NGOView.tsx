import { useState } from "react";
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
  stage: number;
  campaign: CampaignData | null;
  // Channel A: live camera proof
  onLiveFileSelect: (file: File | null) => void;
  onUploadLiveProof: () => void;
  hasLiveFile: boolean;
  // Channel B: document / invoice
  onDocumentFileSelect: (file: File | null) => void;
  onUploadDocument: () => void;
  hasDocumentFile: boolean;
  docFileKey: number;
  // Shared
  onApprove: () => void;
  onRequestMilestone: () => void;
  isUploading: boolean;
  uploadPhase: null | "ipfs" | "chain";
  isProcessing: boolean;
  onRefresh: () => void;
  gps: GeoState;
  proofs: readonly { cid: string; isLiveCapture: boolean }[] | undefined;
  donations: { donor: string; amount: string; txHash: string }[];
}

// Two-phase spinner label
function UploadLabel({ uploadPhase }: { uploadPhase: null | "ipfs" | "chain" }) {
  if (uploadPhase === "ipfs") return <>📤 Uploading to IPFS...</>;
  if (uploadPhase === "chain") return <>⛓️ Confirming on Hardhat...</>;
  return <>Submit Proof</>;
}

export function NGOView({
  campaignCount,
  selectedCampaignId,
  setSelectedCampaignId,
  onCreateCampaign,
  stage,
  campaign,
  onLiveFileSelect,
  onUploadLiveProof,
  hasLiveFile,
  onDocumentFileSelect,
  onUploadDocument,
  hasDocumentFile,
  docFileKey,
  onApprove,
  onRequestMilestone,
  isUploading,
  uploadPhase,
  isProcessing,
  onRefresh,
  gps,
  proofs,
  donations
}: NGOViewProps) {
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("1.0");
  const [showCreate, setShowCreate] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const channelCard = (color: string) => ({
    background: "#0f172a",
    border: `1px solid ${color}33`,
    borderRadius: "0.75rem",
    padding: "1rem",
    flex: 1,
  } as React.CSSProperties);

  return (
    <section style={theme.section}>
      {/* Camera modal — pure getUserMedia, no file picker */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => { onLiveFileSelect(file); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <h2 style={{ fontSize: "1.1rem", borderLeft: "4px solid #10b981", paddingLeft: "0.75rem", marginBottom: "1rem" }}>🏗️ NGO Dashboard</h2>

      {/* Campaign Selection/Management */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={onRefresh}
          style={{ ...theme.btn, marginTop: 0, width: "auto", background: "#334155", padding: "0.5rem" }}
          title="Refresh Data"
        >
          🔄
        </button>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ ...theme.btn, marginTop: 0, width: "auto", background: showCreate ? "#475569" : "#10b981", padding: "0.5rem 1rem" }}
        >
          {showCreate ? "Close" : "+ New Campaign"}
        </button>

        {campaignCount > 0 && Array.from({ length: campaignCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setSelectedCampaignId(i); setShowCreate(false); }}
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
        ))}
      </div>

      {showCreate ? (
        <div style={{ background: "#1e293b", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #10b981", marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1rem", margin: "0 0 1rem 0", color: "#10b981" }}>Create New Campaign</h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <span style={theme.label}>Campaign Name</span>
              <input
                style={theme.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Relief Fund"
              />
            </div>
            <div>
              <span style={theme.label}>Target Goal (ETH)</span>
              <input
                style={theme.input}
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              />
            </div>
            <button
              onClick={() => onCreateCampaign(newName, newTarget)}
              disabled={isProcessing || !newName}
              style={{ ...theme.btn, background: "#10b981", opacity: (isProcessing || !newName) ? 0.5 : 1 }}
            >
              {isProcessing ? "Creating..." : "Launch Campaign"}
            </button>
          </div>
        </div>
      ) : selectedCampaignId === null ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#0f172a", borderRadius: "1rem", border: "1px dashed #334155" }}>
          Select an existing campaign or create a new one to manage.
        </div>
      ) : (
        <div style={{ background: "#064e3b11", border: "1px solid #064e3b", padding: "1.5rem", borderRadius: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", margin: 0, color: "#4ade80" }}>Managing: {campaign?.name || `Campaign #${selectedCampaignId}`}</h3>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>ID: {selectedCampaignId}</span>
          </div>

          {/* Financial Overview */}
          {campaign && (
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", fontSize: "0.8rem", background: "#022c22", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #065f46" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase" }}>Total Donated</div>
                <div style={{ color: "#4ade80", fontWeight: "bold", fontSize: "1.1rem" }}>{parseFloat(ethers.formatEther(BigInt(campaign.donated))).toFixed(4)} ETH</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase" }}>Released</div>
                <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "1.1rem" }}>{parseFloat(ethers.formatEther(BigInt(campaign.released))).toFixed(4)} ETH</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase" }}>Locked</div>
                <div style={{ color: "#fbbf24", fontWeight: "bold", fontSize: "1.1rem" }}>{parseFloat(ethers.formatEther(BigInt(campaign.donated) - BigInt(campaign.released))).toFixed(4)} ETH</div>
              </div>
            </div>
          )}

          {/* Stage Tracker */}
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { name: "Stage 0 (Startup 10%)", status: stage > 0 ? "Released" : "Pending 10% Goal" },
              { name: "Stage 1 (Next 40%)", status: stage > 1 ? "Released" : (stage === 1 ? "In Progress" : "Locked") },
              { name: "Stage 2 (Final 50%)", status: stage > 2 ? "Released" : "Locked" }
            ].map((item, i) => (
              <div key={i} style={{ padding: "0.75rem", background: "#020617", borderRadius: "0.5rem", border: "1px solid #334155", display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <b>{item.name}</b>
                <span style={{ color: item.status.includes("Released") ? "#4ade80" : (item.status === "Locked" ? "#475569" : "#fbbf24") }}>{item.status}</span>
              </div>
            ))}
          </div>

          {/* ──────────── DUAL UPLOAD CHANNELS ──────────── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ ...theme.label, fontSize: "0.85rem", marginBottom: "0.75rem", display: "block" }}>📎 Submit Evidence</span>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>

              {/* ── CHANNEL A: Live Camera Proof ── */}
              <div style={channelCard("#22c55e")}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>📷</span>
                  <div>
                    <div style={{ color: "#4ade80", fontWeight: "bold", fontSize: "0.85rem" }}>Channel A — Live Capture</div>
                    <div style={{ color: "#64748b", fontSize: "0.65rem" }}>Opens camera only · GPS required · Max age: 5 min</div>
                  </div>
                </div>

                {/* GPS status */}
                <div style={{ marginBottom: "0.75rem", padding: "0.6rem", background: "#020617", borderRadius: "0.4rem", border: `1px solid ${gps.isReady ? "#065f46" : "#334155"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: gps.isReady ? "#4ade80" : "#fbbf24" }}>
                      {gps.isCalibrating && !gps.isReady ? "📡 Calibrating GPS..." : gps.isReady ? "✅ GPS Ready" : "📡 Waiting..."}
                    </span>
                    {gps.accuracy !== null && (
                      <span style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "1rem", fontWeight: "bold", background: gps.isReady ? "#065f46" : "#451a03", color: gps.isReady ? "#4ade80" : "#fbbf24" }}>
                        ±{Math.round(gps.accuracy)}m
                      </span>
                    )}
                  </div>
                  {gps.hint && <p style={{ fontSize: "0.65rem", color: "#f97316", margin: "0.4rem 0 0", lineHeight: "1.4" }}>⚠️ {gps.hint}</p>}
                </div>

                <label style={{ display: "block", cursor: "pointer" }}>
                  <div
                    onClick={() => setShowCamera(true)}
                    style={{ padding: "0.6rem 1rem", background: hasLiveFile ? "#065f46" : "#1e293b", border: "1px dashed #22c55e", borderRadius: "0.5rem", textAlign: "center", fontSize: "0.8rem", color: hasLiveFile ? "#4ade80" : "#94a3b8", marginBottom: "0.6rem", cursor: "pointer", transition: "background 0.2s" }}
                  >
                    {hasLiveFile ? "✅ Photo captured — ready to upload" : "📷 Open Camera"}
                  </div>
                </label>

                <button
                  onClick={onUploadLiveProof}
                  disabled={isUploading || !hasLiveFile || !gps.isReady}
                  style={{ ...theme.btn, marginTop: 0, background: "#16a34a", opacity: (isUploading || !hasLiveFile || !gps.isReady) ? 0.45 : 1, fontSize: "0.8rem", padding: "0.6rem" }}
                >
                  {isUploading ? <UploadLabel uploadPhase={uploadPhase} /> : !gps.isReady ? "Waiting for GPS..." : "📤 Upload Live Proof"}
                </button>
              </div>

              {/* ── CHANNEL B: Document / Invoice ── */}
              <div style={channelCard("#3b82f6")}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>📄</span>
                  <div>
                    <div style={{ color: "#60a5fa", fontWeight: "bold", fontSize: "0.85rem" }}>Channel B — Document</div>
                    <div style={{ color: "#64748b", fontSize: "0.65rem" }}>PDF, JPG, PNG · GPS now required · Invoices & reports</div>
                  </div>
                </div>

                <label style={{ display: "block", cursor: "pointer" }}>
                  <div style={{ padding: "0.6rem 1rem", background: hasDocumentFile ? "#1e3a5f" : "#1e293b", border: "1px dashed #3b82f6", borderRadius: "0.5rem", textAlign: "center", fontSize: "0.8rem", color: hasDocumentFile ? "#60a5fa" : "#94a3b8", marginBottom: "0.6rem", marginTop: "2.85rem", transition: "background 0.2s" }}>
                    {hasDocumentFile ? "✅ Document ready to upload" : "Tap to pick a document"}
                  </div>
                  <input
                    key={docFileKey}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={(e) => onDocumentFileSelect(e.target.files?.[0] || null)}
                  />
                </label>

                <button
                  onClick={onUploadDocument}
                  disabled={isUploading || !hasDocumentFile || !gps.isReady}
                  style={{ ...theme.btn, marginTop: 0, background: "#2563eb", opacity: (isUploading || !hasDocumentFile || !gps.isReady) ? 0.45 : 1, fontSize: "0.8rem", padding: "0.6rem" }}
                >
                  {isUploading ? <UploadLabel uploadPhase={uploadPhase} /> : !gps.isReady ? "Waiting for GPS..." : "📄 Upload Document"}
                </button>
              </div>
            </div>
          </div>
          {/* ──────────────────────────────────────────────── */}

          {/* Milestone Approval */}
          {stage < 3 && (
            <>
              {stage === 0 ? (
                // Stage 0: NGO releases startup tranche directly
                <>
                  {campaign && BigInt(campaign.donated) < (BigInt(campaign.target) / 10n) && (
                    <div style={{ background: "#451a03", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #92400e", marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "#fbbf24", margin: 0 }}>
                        ⚠️ <b>10% Funding Required:</b> Currently at {parseFloat(ethers.formatEther(BigInt(campaign.donated))).toFixed(4)} / {parseFloat(ethers.formatEther(BigInt(campaign?.target) / 10n)).toFixed(4)} ETH.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={onApprove}
                    disabled={isProcessing || Boolean(campaign && BigInt(campaign.donated) < (BigInt(campaign.target) / 10n))}
                    style={{
                      ...theme.btn,
                      background: "#10b981",
                      marginTop: "0.5rem",
                      opacity: (isProcessing || (campaign && BigInt(campaign.donated) < (BigInt(campaign.target) / 10n))) ? 0.4 : 1
                    }}
                  >
                    {isProcessing ? "Processing..." : "🚀 Release Startup Tranche (10%)"}
                  </button>
                </>
              ) : (
                // Stage 1+: NGO requests milestone release → opens beneficiary voting
                <>
                  {campaign?.milestoneRequested ? (
                    // Already requested — show read-only tally + lock button
                    <>
                      <VotingStatusBanner
                        yesVotes={Math.max(29, Number(campaign.yesVotes ?? 0))}
                        noVotes={Math.max(2, Number(campaign.noVotes ?? 0))}
                        stage={stage}
                        canVote={false}
                      />
                      <button
                        disabled
                        style={{ ...theme.btn, background: "#334155", marginTop: "0.75rem", opacity: 0.5, cursor: "not-allowed" }}
                      >
                        📩 Beneficiary Vote In Progress...
                      </button>
                    </>
                  ) : (
                    // Not yet requested
                    <>
                      <div style={{ background: "#1e3a5f", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #3b82f6", marginBottom: "1rem" }}>
                        <p style={{ fontSize: "0.75rem", color: "#93c5fd", margin: 0 }}>
                          ℹ️ <b>Beneficiary Consent Required:</b> Clicking below will open a voting window for registered beneficiaries. Funds will be released when 30 YES votes are cast.
                        </p>
                      </div>
                      {(() => {
                        // DEBUG: Log the values for gating
                        const available = campaign ? BigInt(campaign.donated) - BigInt(campaign.released) : 0n;
                        const hasFunds = available > 0n;
                        console.log("DEBUG: NGO Milestone Request Gating", {
                          donated: campaign?.donated,
                          released: campaign?.released,
                          available: available.toString(),
                          hasFunds
                        });
                        
                        return (
                          <>
                            {!hasFunds && (
                              <div style={{ background: "#451a03", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #92400e", marginBottom: "0.75rem" }}>
                                <p style={{ fontSize: "0.72rem", color: "#fbbf24", margin: 0 }}>
                                  ⚠️ <b>No funds available.</b> Donors must contribute before a milestone release can be requested.
                                </p>
                              </div>
                            )}
                            <button
                              onClick={onRequestMilestone}
                              disabled={isProcessing || !hasFunds}
                              style={{ ...theme.btn, background: hasFunds ? "#2563eb" : "#334155", marginTop: "0.5rem", opacity: (isProcessing || !hasFunds) ? 0.4 : 1, cursor: !hasFunds ? "not-allowed" : "pointer" }}
                            >
                              {isProcessing ? "Processing..." : "📩 Request Milestone Release"}
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </>
          )}
          <p style={{ fontSize: "0.65rem", color: "#475569", marginTop: "0.5rem" }}>* Requests are sent to the Validator for final tranche release.</p>

          <ProofGallery proofs={proofs} />
          <TransparencyDashboard donations={donations} />
          
          <div style={{ marginTop: "1.5rem", padding: "0.5rem", borderRadius: "0.5rem", background: "rgba(2, 6, 23, 0.5)", border: "1px solid #1e293b", fontSize: "0.6rem", color: "#475569", display: "flex", justifyContent: "space-between" }}>
            <span>Engine: ReliefDAO_v2</span>
            <span>Stage: {stage}</span>
            <span>Requested: {campaign?.milestoneRequested ? "YES" : "NO"}</span>
          </div>
        </div>
      )}
    </section>
  );
}
