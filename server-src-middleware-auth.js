const jwt = require('jsonwebtoken');

// Reads "Authorization: Bearer <token>", verifies it, and attaches the
// decoded payload ({ sub, role, email }) to req.user. Routes that need to
// know who's calling (like GET /api/auth/me) use this.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
