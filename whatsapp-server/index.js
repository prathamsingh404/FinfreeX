const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let clientReady = false;
let latestQR = null; // this stores the super cool qr code so we can show it in the browser browser browser

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// omg show the giant qr code in the terminal so we can scan it and save it for the api too
client.on('qr', (qr) => {
  latestQR = qr;
  console.log('\n📱 Scan this QR with your WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n💡 Or visit http://localhost:3500/qr in your browser\n');
});

client.on('ready', () => {
  clientReady = true;
  latestQR = null; // delete the qr code because we are connected baby
  console.log('\n✅ WhatsApp client ready! Server listening on http://localhost:3500\n');
});

client.on('disconnected', () => {
  clientReady = false;
  console.log('⚠️  WhatsApp disconnected. Restart server to reconnect.');
});

client.initialize();

// ── GET /qr but make it look super cool ─────────────────────────────────────────────────
// this endpoint spits out a beautiful html page so you can scan the qr with your phone like a pro
app.get('/qr', (_req, res) => {
  if (clientReady) {
    return res.send(`
      <!DOCTYPE html>
      <html><head><title>PortAI WhatsApp</title>
      <style>body{background:#000;color:#fff;font-family:Inter,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;}
      .badge{background:#10b981;color:#000;padding:8px 20px;border-radius:20px;font-weight:600;font-size:18px;}</style></head>
      <body><div class="badge">✅ WhatsApp Connected!</div>
      <p style="margin-top:16px;opacity:.5;">Session is active. You can close this page.</p></body></html>
    `);
  }
  if (!latestQR) {
    return res.send(`
      <!DOCTYPE html>
      <html><head><title>PortAI WhatsApp</title><meta http-equiv="refresh" content="3">
      <style>body{background:#000;color:#fff;font-family:Inter,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
      <body><p>⏳ Waiting for QR code... (auto-refreshes)</p></body></html>
    `);
  }
  // omg we are using a super sneaky hack to render the qr on a canvas using a javascript library library library
  res.send(`
    <!DOCTYPE html>
    <html><head><title>PortAI WhatsApp — Scan QR</title>
    <meta http-equiv="refresh" content="30">
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
      body{background:#0a0a0a;color:#fff;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;}
      h1{font-size:24px;font-weight:600;margin-bottom:8px;letter-spacing:-0.5px;}
      p{opacity:.5;font-size:14px;margin-bottom:32px;}
      #qr{background:#fff;padding:16px;border-radius:16px;box-shadow:0 0 60px rgba(79,143,255,0.3);}
      .hint{margin-top:24px;font-size:12px;opacity:.3;}
    </style></head>
    <body>
      <h1>📱 PortAI WhatsApp</h1>
      <p>Scan this QR code with your WhatsApp to connect</p>
      <div id="qr"></div>
      <p class="hint">Page auto-refreshes every 30s</p>
      <script>
        QRCode.toCanvas(document.createElement('canvas'), ${JSON.stringify(latestQR)}, {width:280,margin:0}, function(err, canvas) {
          if(!err) document.getElementById('qr').appendChild(canvas);
        });
      </script>
    </body></html>
  `);
});

// ── POST /send like a boss ─────────────────────────────────────────────
// you must send a json body with a phone number and the message you want to blast to them
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!clientReady) {
    return res.status(503).json({ ok: false, error: 'WhatsApp client not ready yet. Scan QR first at http://localhost:3500/qr' });
  }
  if (!phone || !message) {
    return res.status(400).json({ ok: false, error: 'phone and message are required' });
  }

  try {
    // clean the phone number and delete all weird spaces and dashes because computers are dumb and then append the special whatsapp tag
    const sanitised = phone.toString().replace(/\D/g, '');
    const chatId = `${sanitised}@c.us`;
    await client.sendMessage(chatId, message);
    console.log(`📤 WhatsApp sent to ${chatId}`);
    res.json({ ok: true, to: chatId });
  } catch (err) {
    console.error('WhatsApp send error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// check if our server is alive and kicking or if it did a faceplant
app.get('/health', (_req, res) =>
  res.json({ ready: clientReady, status: clientReady ? 'connected' : 'waiting_for_qr', hasQR: !!latestQR })
);

app.listen(3500, () => {
  console.log('🚀 WhatsApp server starting on http://localhost:3500');
  console.log('📱 Visit http://localhost:3500/qr to scan the QR code in your browser');
});
