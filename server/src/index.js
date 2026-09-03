require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const db = require('./db');
const authRoutes = require('./routes/auth');
const verifyRoutes = require('./routes/verify');
const registryRoutes = require('./routes/registry');
const miscRoutes = require('./routes/misc');

if (!process.env.JWT_SECRET) {
  console.warn(
    '[skillbridge] WARNING: JWT_SECRET is not set — using an insecure default. ' +
    'Copy server/.env.example to server/.env and set a real secret before deploying anywhere.'
  );
  process.env.JWT_SECRET = 'dev-only-insecure-secret';
}

db.ensureDb();
db.seedDemoAccounts(pw => bcrypt.hashSync(pw, 10));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/registry', registryRoutes);
app.use('/api', miscRoutes);

// Serve the existing static frontend (index.html, sign_in.html, etc.) from
// the repo root, so `npm start` alone runs the whole app on one port.
const REPO_ROOT = path.join(__dirname, '..', '..');
app.use(express.static(REPO_ROOT));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`SkillBridge API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
