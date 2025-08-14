// server.js
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Log every request so we see what's being served
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Disable caching in dev
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Serve ./public statically
const pub = path.join(__dirname, 'public');
app.use(express.static(pub, { extensions: ['html'] }));

// Health check
app.get('/health', (_req, res) => res.type('text').send('ok'));

// 404 fallback
app.use((_req, res) => res.status(404).type('text').send('Not found'));

app.listen(PORT, () => {
  console.log(`\nRehabify dev server → http://localhost:${PORT}`);
  console.log(`Serving folder: ${pub}\n`);
});
