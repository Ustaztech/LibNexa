const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode-terminal/vendor/QRCode');
const QRErrorCorrectLevel = require('qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.')) {
        return iface.address;
      }
    }
  }
  return '10.111.185.208';
}

const LOCAL_IP = getLocalIp();
const EXPO_URL = `exp://${LOCAL_IP}:8081`;
const API_URL = `http://${LOCAL_IP}:5000/api/v1`;

// Generate QR matrix
const qr = new QRCode(-1, QRErrorCorrectLevel.M);
qr.addData(EXPO_URL);
qr.make();

const moduleCount = qr.getModuleCount();
const cellSize = 10;
const margin = 4;
const totalSize = (moduleCount + margin * 2) * cellSize;

let rects = [];
for (let r = 0; r < moduleCount; r++) {
  for (let c = 0; c < moduleCount; c++) {
    if (qr.modules[r][c]) {
      const x = (c + margin) * cellSize;
      const y = (r + margin) * cellSize;
      rects.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`);
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="320" height="320">
  <rect width="${totalSize}" height="${totalSize}" fill="#ffffff" rx="16" />
  ${rects.join('\n  ')}
</svg>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIBNEXA Mobile — Expo Go QR Code</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #09121d 0%, #0d1e33 50%, #0a2540 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
    }
    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.25);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(14, 165, 233, 0.15);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 15px;
      margin-bottom: 28px;
    }
    .qr-container {
      background: #ffffff;
      padding: 20px;
      border-radius: 20px;
      display: inline-block;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      margin-bottom: 24px;
    }
    .url-box {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      color: #38bdf8;
      font-weight: 600;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: left;
      margin-top: 10px;
    }
    .info-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px;
    }
    .info-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .info-value {
      font-size: 14px;
      color: #e2e8f0;
      font-weight: 500;
    }
    .info-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .steps {
      margin-top: 24px;
      text-align: left;
      background: rgba(14, 165, 233, 0.08);
      border: 1px solid rgba(14, 165, 233, 0.2);
      border-radius: 14px;
      padding: 18px 20px;
    }
    .steps h3 {
      font-size: 14px;
      color: #38bdf8;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .steps ol {
      padding-left: 20px;
      color: #cbd5e1;
      font-size: 13.5px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      EXPO SDK 57 &bull; LAN READY
    </div>
    <h1>LIBNEXA Mobile &bull; Expo Go (SDK 57)</h1>
    <p class="subtitle">Nasarawa State University, Keffi &bull; Digital Library Companion</p>

    <div class="qr-container">
      ${svg}
    </div>

    <div class="url-box">
      ${EXPO_URL}
    </div>

    <div class="grid">
      <div class="info-card">
        <div class="info-title">Backend API Endpoint</div>
        <div class="info-value">${API_URL}</div>
        <div class="info-sub">Direct Wi-Fi connection</div>
      </div>
      <div class="info-card">
        <div class="info-title">Student Library Pass</div>
        <div class="info-value">NSUK Student Authentication</div>
        <div class="info-sub">Sign in with campus matric or register account</div>
      </div>
    </div>

    <div class="steps">
      <h3>Quick Connect Instructions</h3>
      <ol>
        <li>Ensure your mobile device is connected to the same Wi-Fi network (<strong>10.174.41.x</strong>).</li>
        <li>Open <strong>Expo Go</strong> on Android, or the <strong>Camera</strong> app on iOS.</li>
        <li>Scan the QR code above to immediately launch the LibNexa mobile application.</li>
        <li>Sign in with your student credentials or register your account to access catalog search, book reservations, loan renewals, and your digital library ID pass!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

const outDir = path.resolve(__dirname, '../apps/mobile');
fs.writeFileSync(path.join(outDir, 'expo_qr_code.svg'), svg, 'utf8');
fs.writeFileSync(path.join(outDir, 'expo_qr_scanner.html'), html, 'utf8');

console.log('Successfully generated expo_qr_code.svg and expo_qr_scanner.html');
