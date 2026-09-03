const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const ROLES = ['student', 'college', 'recruiter'];

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Never send the password hash back to the client.
function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post('/signup', (req, res) => {
  const { role, email, password } = req.body || {};

  if (!role || !email || !password) {
    return res.status(422).json({ error: 'role, email and password are required' });
  }
  if (!ROLES.includes(role)) {
    return res.status(422).json({ error: `role must be one of: ${ROLES.join(', ')}` });
  }
  if (String(password).length < 8) {
    return res.status(422).json({ error: 'password must be at least 8 characters' });
  }
  if (db.findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = db.createUser({ role, email, passwordHash });
  const token = signToken(user);

  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(422).json({ error: 'email and password are required' });
  }

  const user = db.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
