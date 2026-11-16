const mineflayer = require('mineflayer');
const express = require('express');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;

let botStatus = 'Starting...';
let startTime = Date.now();
let botCoords = { x: 0, y: 0, z: 0 };

app.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.send(`
    <h2>Minecraft AFK Bot Status</h2>
    <p><b>Status:</b> ${botStatus}</p>
    <p><b>Server:</b> ${config.server.ip}:${config.server.port}</p>
    <p><b>Uptime:</b> ${uptimeSeconds} seconds</p>
    <p><b>Coordinates:</b> X: ${Math.round(botCoords.x)}, Y: ${Math.round(botCoords.y)}, Z: ${Math.round(botCoords.z)}</p>
  `);
});

app.listen(PORT, () => {
  console.log(`[Web Server] Running on port ${PORT}`);
});

function createBot() {
  const bot = mineflayer.createBot({
    host: config.server.ip,
    port: parseInt(config.server.port),
    username: config['bot-account'].username,
    version: config.server.version || false,
    auth: 'offline'
  });

  bot.on('login', () => {
    botStatus = 'Online & Running';
    startTime = Date.now();
    console.log(`[Bot] Logged in as ${bot.username}`);
  });

  bot.on('spawn', () => {
    botStatus = 'Online & In-Game';
    console.log('[Bot] Spawned in the server!');

    // Anti-AFK movement (har 15 second mein jump aur look around)
    setInterval(() => {
      if (!bot.entity) return;
      botCoords = bot.entity.position;

      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);

      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      bot.look(yaw, pitch, true);
    }, 15000);
  });

  bot.on('kicked', (reason) => {
    botStatus = `Kicked: ${reason}`;
    console.log(`[Bot] Kicked from server:`, reason);
  });

  bot.on('error', (err) => {
    botStatus = `Error: ${err.message}`;
    console.log(`[Bot] Error:`, err.message);
  });

  bot.on('end', () => {
    botStatus = 'Disconnected - Reconnecting...';
    console.log('[Bot] Disconnected. Reconnecting in 10 seconds...');
    if (config['auto-reconnect']) {
      setTimeout(createBot, 10000);
    }
  });
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[System] SIGTERM received. Exiting...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[System] Manual stop requested. Exiting...');
  process.exit(0);
});

// START THE BOT
console.log('='.repeat(50));
console.log('Minecraft AFK Bot Starting...');
console.log(`Server: ${config.server.ip}:${config.server.port}`);
console.log(`Auto-Reconnect: ${config['auto-reconnect'] ? 'Enabled' : 'Disabled'}`);
console.log('='.repeat(50));

createBot();
