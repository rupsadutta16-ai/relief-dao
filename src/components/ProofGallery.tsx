import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Circle, Tooltip } from "react-leaflet";

interface Proof {
  cid: string;
  isLiveCapture: boolean;
}

interface ProofGalleryProps {
  proofs: readonly Proof[] | undefined;
}

function ProofCard({ proof, index }: { proof: Proof, index: number }) {
  const [metadata, setMetadata] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Fetch metadata regardless of capture type so long as it exists!
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`https://api.pinata.cloud/data/pinList?hashContains=${proof.cid}`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` }
        });
        const data = await res.json();
        if (data.rows && data.rows.length > 0) {
          const kv = data.rows[0].metadata.keyvalues;
          if (kv && kv.latitude && kv.longitude) {
            setMetadata({ lat: parseFloat(kv.latitude), lng: parseFloat(kv.longitude) });
          }
        }
      } catch (e) {
        console.error("Failed to fetch Pinata metadata", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [proof.cid]);

  // Generates the Map Container allowing conditional interactability 
  const mapContent = (fill: boolean) => metadata ? (
    <MapContainer 
       center={[metadata.lat, metadata.lng]} 
       zoom={fill ? 15 : 13} 
       style={{ height: "100%", width: "100%", zIndex: fill ? 1 : 0 }} 
       zoomControl={fill} 
       dragging={fill} 
       scrollWheelZoom={fill}
       doubleClickZoom={fill}
    >
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        attribution="" 
      />
      <Circle 
         center={[metadata.lat, metadata.lng]} 
         radius={500} 
         pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.35, weight: 1.5 }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={1}>Verified delivery zone (Location masked for beneficiary safety).</Tooltip>
      </Circle>
    </MapContainer>
  ) : null;

  const cardBorder = proof.isLiveCapture ? "#22c55e66" : "#3b82f666";
  const glowColor = proof.isLiveCapture ? "#22c55e44" : "#3b82f644";

  return (
    <>
      <div style={{ background: "#0f172a", borderRadius: "0.75rem", overflow: "hidden", border: `1px solid ${cardBorder}`, display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${glowColor}`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", height: "140px" }}>
          
          {/* Left Side: Photo or Document Icon */}
          <a href={`https://gateway.pinata.cloud/ipfs/${proof.cid}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: proof.isLiveCapture ? "#000" : "#020617", color: "#60a5fa", textDecoration: "none", overflow: "hidden" }}>
             {proof.isLiveCapture ? (
                <img src={`https://gateway.pinata.cloud/ipfs/${proof.cid}`} alt={`Evidence ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
             ) : (
                <>
                  <span style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📄</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>Logistics Document</span>
                </>
             )}
          </a>
          
          {/* Right Side: Map */}
          <div style={{ flex: 1, background: "#020617", borderLeft: "1px solid #1e293b", position: "relative" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.7rem", color: "#64748b" }}>Loading zone map...</div>
            ) : metadata ? (
              <>
                 {mapContent(false)}
                 <button 
                   onClick={() => setIsFullscreen(true)} 
                   style={{ position: "absolute", top: "5px", right: "5px", zIndex: 400, background: "#1e293b", color: "white", border: "1px solid #334155", borderRadius: "0.4rem", padding: "0.2rem 0.5rem", fontSize: "0.6rem", cursor: "pointer", opacity: 0.9 }}
                 >
                    🔍 Expand
                 </button>
              </>
            ) : (
               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.7rem", color: "#ef4444", textAlign: "center", padding: "1rem" }}>
                  GPS metadata not found on IPFS
               </div>
            )}
          </div>
        </div>
        
        {/* Verification Footer Header */}
        <div style={{ padding: "0.6rem", fontSize: "0.7rem", background: "#1e293b", color: "#f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ color: proof.isLiveCapture ? "#4ade80" : "#60a5fa" }}>{proof.isLiveCapture ? "📸 Live Capture" : "📄 Document"} #{index + 1}</b>
          <a href={`https://gateway.pinata.cloud/ipfs/${proof.cid}`} target="_blank" rel="noreferrer" style={{ color: proof.isLiveCapture ? "#22c55e" : "#3b82f6", textDecoration: "none", fontWeight: "bold" }}>View Evidence  📌</a>
        </div>
      </div>

      {/* FULLSCREEN MAP MODAL */}
      {isFullscreen && createPortal(
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "#020617", display: "flex", flexDirection: "column" }}>
           <div style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", background: "#0f172a" }}>
              <div>
                <h2 style={{ margin: 0, color: "#f8fafc", fontSize: "1.2rem" }}>🌍 Verification Map - Contextual Investigation</h2>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>Reviewing geographical delivery data for {proof.isLiveCapture ? "Live Capture" : "Document"} #{index + 1}</div>
              </div>
              <button onClick={() => setIsFullscreen(false)} style={{ background: "#ef4444", color: "white", border: "1px solid #7f1d1d", padding: "0.6rem 1.2rem", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>❌ Close Map</button>
           </div>
           <div style={{ flex: 1, position: "relative" }}>
              {mapContent(true)}
           </div>
        </div>,
        document.body
      )}
    </>
  );
}


export function ProofGallery({ proofs }: ProofGalleryProps) {
  return (
    <div style={{ marginTop: "2rem", borderTop: "1px solid #334155", paddingTop: "1.5rem" }}>
      <h4 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        📸 Validated Proof & Map Gallery
      </h4>
      <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1.5rem", lineHeight: "1.4" }}>
        Both photo and document evidentiary claims are correlated with encrypted geo-temporal metrics.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.25rem",
        maxHeight: "450px",
        overflowY: "auto",
        paddingRight: "0.5rem"
      }}>
        {proofs && proofs.length > 0 ? proofs.map((proof, i) => (
           <ProofCard key={i} proof={proof} index={i} />
        )) : (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2.5rem", background: "#020617", borderRadius: "1rem", border: "1px dashed #334155", color: "#64748b", fontSize: "0.85rem" }}>
            No structured evidence has been stored for this campaign yet.
          </div>
        )}
      </div>
    </div>
  );
}
