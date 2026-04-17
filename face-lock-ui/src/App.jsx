import { useRef, useState, useEffect } from "react";

const UPLOAD_URL = "https://ukvokmaw06.execute-api.us-east-2.amazonaws.com/default/file_uploader";
const AUTH_URL = "https://63qk377js6.execute-api.us-east-2.amazonaws.com/default/face-auth-function";
const REGISTER_URL = "https://lndn4ul4k8.execute-api.us-east-2.amazonaws.com/default/face-register-function";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLineRef = useRef(null);

  const [mode, setMode] = useState("authenticate"); // "authenticate" | "register"
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState(null); // { type: "success"|"error"|"info", message }
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
        setCamReady(true);
      })
      .catch(() => setResult({ type: "error", message: "Camera permission denied ❌" }));

    // Generate particles
    const pts = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 5,
    }));
    setParticles(pts);
  }, []);

  const uploadToS3 = async (blob) => {
    const res = await fetch(UPLOAD_URL);
    const data = await res.json();
    await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: blob,
    });
    return data.fileName;
  };

  const captureAndProcess = () => {
    if (loading || !camReady) return;
    if (mode === "register" && !userId.trim()) {
      setResult({ type: "error", message: "Please enter your name first!" });
      return;
    }

    setScanning(true);
    setResult(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      setLoading(true);
      setScanning(false);

      try {
        const fileName = await uploadToS3(blob);
        if (!fileName) throw new Error("Upload failed");

        if (mode === "register") {
          const res = await fetch(REGISTER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageName: fileName, userId: userId.trim() }),
          });
          const data = await res.json();
          setResult({
            type: res.ok ? "success" : "error",
            message: data.message || (res.ok ? `${userId} Registered ✅` : "Registration Failed ❌"),
          });
        } else {
          const res = await fetch(AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageName: fileName }),
          });
          const data = await res.json();
          setResult({
            type: res.status === 200 ? "success" : "error",
            message: data.message || (res.status === 200 ? "Access Granted ✅" : "Access Denied ❌"),
          });
        }
      } catch (err) {
        setResult({ type: "error", message: "Something went wrong ❌" });
        console.error(err);
      }

      setLoading(false);
    }, "image/png");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cyan: #00f5ff;
          --cyan-dim: #00b8c8;
          --green: #00ff9d;
          --red: #ff3d6b;
          --bg: #020810;
          --bg2: #060f1a;
          --panel: rgba(0, 245, 255, 0.04);
          --border: rgba(0, 245, 255, 0.2);
          --border-bright: rgba(0, 245, 255, 0.6);
        }

        body {
          background: var(--bg);
          font-family: 'Rajdhani', sans-serif;
          color: var(--cyan);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }

        /* Grid background */
        .app::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
        }

        /* Radial glow center */
        .app::after {
          content: '';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Floating particles */
        .particle {
          position: fixed;
          border-radius: 50%;
          background: var(--cyan);
          opacity: 0;
          pointer-events: none;
          animation: floatUp linear infinite;
          z-index: 0;
        }

        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          10% { opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-100vh) scale(0.3); }
        }

        /* Main card */
        .card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          background: var(--panel);
          border: 1px solid var(--border);
          backdrop-filter: blur(20px);
          clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px));
          padding: 40px 36px;
          animation: cardIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Corner decorations */
        .card::before {
          content: '';
          position: absolute;
          top: -1px; right: -1px;
          width: 40px; height: 40px;
          background: linear-gradient(135deg, transparent 50%, var(--cyan-dim) 50%);
          clip-path: polygon(100% 0, 100% 100%, 0 0);
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .header-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 8px;
          filter: drop-shadow(0 0 12px var(--cyan));
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { filter: drop-shadow(0 0 12px var(--cyan)); }
          50% { filter: drop-shadow(0 0 24px var(--cyan)) drop-shadow(0 0 48px var(--cyan)); }
        }

        .title {
          font-family: 'Orbitron', monospace;
          font-size: 1.6rem;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          background: linear-gradient(135deg, var(--cyan) 0%, #fff 50%, var(--cyan) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 0.8rem;
          letter-spacing: 4px;
          color: rgba(0,245,255,0.5);
          margin-top: 4px;
          text-transform: uppercase;
        }

        /* Mode toggle */
        .mode-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin-bottom: 28px;
          border: 1px solid var(--border);
          overflow: hidden;
        }

        .mode-btn {
          padding: 10px;
          background: transparent;
          border: none;
          color: rgba(0,245,255,0.4);
          font-family: 'Orbitron', monospace;
          font-size: 0.65rem;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.3s;
          text-transform: uppercase;
          position: relative;
        }

        .mode-btn.active {
          background: rgba(0,245,255,0.12);
          color: var(--cyan);
          text-shadow: 0 0 12px var(--cyan);
        }

        .mode-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: var(--cyan);
          box-shadow: 0 0 8px var(--cyan);
        }

        .mode-btn:not(.active):hover {
          color: rgba(0,245,255,0.7);
          background: rgba(0,245,255,0.05);
        }

        /* Camera container */
        .cam-wrap {
          position: relative;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .cam-frame {
          position: relative;
          aspect-ratio: 4/3;
          background: #000;
          overflow: hidden;
        }

        .cam-frame video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scaleX(-1);
        }

        /* Corner brackets */
        .corner {
          position: absolute;
          width: 24px; height: 24px;
          z-index: 2;
        }
        .corner::before, .corner::after {
          content: '';
          position: absolute;
          background: var(--cyan);
          box-shadow: 0 0 8px var(--cyan);
        }
        .corner::before { width: 2px; height: 100%; }
        .corner::after { width: 100%; height: 2px; }

        .corner.tl { top: 10px; left: 10px; }
        .corner.tr { top: 10px; right: 10px; transform: scaleX(-1); }
        .corner.bl { bottom: 10px; left: 10px; transform: scaleY(-1); }
        .corner.br { bottom: 10px; right: 10px; transform: scale(-1); }

        /* Face target reticle */
        .reticle {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 120px; height: 140px;
          border: 1px solid rgba(0,245,255,0.3);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          z-index: 2;
          animation: reticlePulse 2s ease-in-out infinite;
        }

        @keyframes reticlePulse {
          0%, 100% { border-color: rgba(0,245,255,0.3); box-shadow: none; }
          50% { border-color: rgba(0,245,255,0.7); box-shadow: 0 0 16px rgba(0,245,255,0.3) inset; }
        }

        /* Scan line */
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--cyan), transparent);
          box-shadow: 0 0 12px var(--cyan);
          z-index: 3;
          opacity: 0;
          top: 0;
        }

        .scan-line.active {
          animation: scanDown 1.5s ease-in-out infinite;
          opacity: 1;
        }

        @keyframes scanDown {
          0% { top: 0%; }
          100% { top: 100%; }
        }

        /* Status overlay */
        .cam-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
          background: rgba(2,8,16,0.85);
          flex-direction: column;
          gap: 12px;
        }

        .spinner {
          width: 40px; height: 40px;
          border: 2px solid rgba(0,245,255,0.2);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .processing-text {
          font-family: 'Orbitron', monospace;
          font-size: 0.6rem;
          letter-spacing: 3px;
          color: var(--cyan);
          animation: blink 1s step-end infinite;
        }

        @keyframes blink { 50% { opacity: 0; } }

        /* Input */
        .input-wrap {
          margin-bottom: 20px;
          position: relative;
        }

        .input-label {
          display: block;
          font-family: 'Orbitron', monospace;
          font-size: 0.6rem;
          letter-spacing: 3px;
          color: rgba(0,245,255,0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .input-field {
          width: 100%;
          background: rgba(0,245,255,0.04);
          border: 1px solid var(--border);
          color: var(--cyan);
          padding: 12px 16px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 1rem;
          letter-spacing: 2px;
          outline: none;
          transition: all 0.3s;
        }

        .input-field::placeholder { color: rgba(0,245,255,0.2); }

        .input-field:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 16px rgba(0,245,255,0.15), inset 0 0 16px rgba(0,245,255,0.05);
        }

        /* Action button */
        .action-btn {
          width: 100%;
          padding: 16px;
          background: transparent;
          border: 1px solid var(--cyan);
          color: var(--cyan);
          font-family: 'Orbitron', monospace;
          font-size: 0.75rem;
          letter-spacing: 4px;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }

        .action-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--cyan);
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
          z-index: -1;
        }

        .action-btn:hover::before { transform: translateX(0); }
        .action-btn:hover { color: var(--bg); text-shadow: none; }

        .action-btn:not(:disabled) {
          box-shadow: 0 0 20px rgba(0,245,255,0.2);
          text-shadow: 0 0 8px var(--cyan);
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: rgba(0,245,255,0.3);
        }

        /* Result */
        .result-box {
          margin-top: 20px;
          padding: 16px 20px;
          border-left: 3px solid;
          position: relative;
          animation: resultIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
        }

        @keyframes resultIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .result-box.success {
          border-color: var(--green);
          background: rgba(0,255,157,0.06);
        }

        .result-box.error {
          border-color: var(--red);
          background: rgba(255,61,107,0.06);
        }

        .result-text {
          font-family: 'Orbitron', monospace;
          font-size: 0.8rem;
          letter-spacing: 2px;
        }

        .result-box.success .result-text { color: var(--green); text-shadow: 0 0 12px var(--green); }
        .result-box.error .result-text { color: var(--red); text-shadow: 0 0 12px var(--red); }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .divider-text {
          font-family: 'Orbitron', monospace;
          font-size: 0.55rem;
          letter-spacing: 3px;
          color: rgba(0,245,255,0.3);
        }

        /* Footer */
        .footer {
          margin-top: 24px;
          text-align: center;
          font-size: 0.7rem;
          letter-spacing: 3px;
          color: rgba(0,245,255,0.2);
          font-family: 'Orbitron', monospace;
        }

        /* Glitch effect on title hover */
        .title:hover {
          animation: glitch 0.3s step-end;
        }

        @keyframes glitch {
          0% { text-shadow: 2px 0 var(--red), -2px 0 var(--green); }
          33% { text-shadow: -2px 0 var(--red), 2px 0 var(--green); }
          66% { text-shadow: 2px 2px var(--red), -2px -2px var(--green); }
          100% { text-shadow: none; }
        }
      `}</style>

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div className="app">
        <div className="card">
          {/* Header */}
          <div className="header">
            <span className="header-icon">🔐</span>
            <h1 className="title">FaceLock</h1>
            <p className="subtitle">Biometric Access System</p>
          </div>

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === "authenticate" ? "active" : ""}`}
              onClick={() => { setMode("authenticate"); setResult(null); }}
            >
              ⚡ Authenticate
            </button>
            <button
              className={`mode-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => { setMode("register"); setResult(null); }}
            >
              ＋ Register
            </button>
          </div>

          {/* Camera */}
          <div className="cam-wrap">
            <div className="cam-frame">
              <video ref={videoRef} autoPlay playsInline muted />

              {/* Corner brackets */}
              <div className="corner tl" />
              <div className="corner tr" />
              <div className="corner bl" />
              <div className="corner br" />

              {/* Face reticle */}
              <div className="reticle" />

              {/* Scan line */}
              <div className={`scan-line ${scanning ? "active" : ""}`} ref={scanLineRef} />

              {/* Loading overlay */}
              {loading && (
                <div className="cam-overlay">
                  <div className="spinner" />
                  <div className="processing-text">
                    {mode === "register" ? "REGISTERING..." : "IDENTIFYING..."}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Name input for register mode */}
          {mode === "register" && (
            <div className="input-wrap">
              <label className="input-label">User Identity</label>
              <input
                className="input-field"
                type="text"
                placeholder="Enter your name..."
                value={userId}
                onChange={e => setUserId(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* Action Button */}
          <button
            className="action-btn"
            onClick={captureAndProcess}
            disabled={loading || !camReady}
          >
            {loading
              ? "Processing..."
              : mode === "register"
              ? "▸ Register Face"
              : "▸ Scan & Authenticate"}
          </button>

          {/* Result */}
          {result && (
            <div className={`result-box ${result.type}`}>
              <div className="result-text">{result.message}</div>
            </div>
          )}

          <div className="divider">
            <div className="divider-line" />
            <div className="divider-text">Secure · Encrypted · AI Powered</div>
            <div className="divider-line" />
          </div>

          <div className="footer">SYSTEM v2.0 · ACTIVE</div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}