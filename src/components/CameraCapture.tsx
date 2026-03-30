import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        // Try rear camera first (works on mobile), fall back to any available camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e: unknown) {
        if (active) setError("Camera access denied. Please allow camera permission in your browser.");
      }
    };
    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const url = canvas.toDataURL("image/jpeg", 0.92);
    setPreviewUrl(url);
    setCaptured(true);

    // Stop the stream now — camera light turns off after capture
    streamRef.current?.getTracks().forEach(t => t.stop());

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      setCapturedFile(file);
    }, "image/jpeg", 0.92);
  };

  const handleRetake = async () => {
    setCaptured(false);
    setPreviewUrl(null);
    setCapturedFile(null);
    // Restart stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError("Could not restart camera.");
    }
  };

  const handleUse = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000ee",
      zIndex: 9999, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center"
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: "520px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "#0f172a", borderBottom: "1px solid #334155" }}>
        <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: "0.9rem" }}>📸 Live Camera Capture</span>
        <button
          onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
        >✕</button>
      </div>

      {/* Camera viewport / preview */}
      <div style={{ background: "#020617", width: "100%", maxWidth: "520px", position: "relative" }}>
        {error ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#f87171", fontSize: "0.85rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🚫</div>
            {error}
          </div>
        ) : captured && previewUrl ? (
          <img src={previewUrl} alt="Captured" style={{ width: "100%", display: "block" }} />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", display: "block", background: "#000" }}
          />
        )}
        {/* Hidden canvas used for capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Viewfinder corners (decorative) */}
        {!captured && !error && (
          <>
            <div style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: "2px solid #4ade80", borderLeft: "2px solid #4ade80" }} />
            <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: "2px solid #4ade80", borderRight: "2px solid #4ade80" }} />
            <div style={{ position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: "2px solid #4ade80", borderLeft: "2px solid #4ade80" }} />
            <div style={{ position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: "2px solid #4ade80", borderRight: "2px solid #4ade80" }} />
          </>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ width: "100%", maxWidth: "520px", padding: "1rem", background: "#0f172a", display: "flex", gap: "0.75rem", borderTop: "1px solid #1e293b" }}>
        {!captured ? (
          <button
            onClick={handleCapture}
            disabled={!!error}
            style={{
              flex: 1, padding: "0.85rem", background: "#16a34a", border: "none", borderRadius: "0.75rem",
              color: "white", fontWeight: "bold", fontSize: "1rem", cursor: "pointer",
              opacity: error ? 0.4 : 1, transition: "transform 0.1s"
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            📸 Capture
          </button>
        ) : (
          <>
            <button
              onClick={handleRetake}
              style={{ flex: 1, padding: "0.85rem", background: "#334155", border: "none", borderRadius: "0.75rem", color: "white", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer" }}
            >
              🔄 Retake
            </button>
            <button
              onClick={handleUse}
              disabled={!capturedFile}
              style={{ flex: 1, padding: "0.85rem", background: "#3b82f6", border: "none", borderRadius: "0.75rem", color: "white", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer", opacity: capturedFile ? 1 : 0.5 }}
            >
              ✅ Use This Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
