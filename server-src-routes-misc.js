const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/waitlist', (req, res) => {
  const { role, email } = req.body || {};
  if (!role || !email) {
    return res.status(422).json({ error: 'role and email are required' });
  }
  res.status(201).json({ entry: db.addWaitlist({ role, email }) });
});

router.post('/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(422).json({ error: 'name, email and message are required' });
  }
  res.status(201).json({ entry: db.addContact({ name, email, message }) });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = router;
