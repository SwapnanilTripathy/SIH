const express = require('express');
const db = require('../db');

const router = express.Router();

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AISHE_RE = /^[UC]-[0-9]{3,6}$/;

// If the email on a successful verification matches a signed-up user with
// the same role, link that user's account to the matched registry record
// and flip their verified flag.
function tryLinkUser(role, email, record) {
  if (!email) return;
  const user = db.findUserByEmail(email);
  if (user && user.role === role) {
    db.markUserVerified(email, role, record);
  }
}

function missingFields(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([k]) => k);
}

// Matching rules below deliberately mirror what was already hardcoded into
// verify_recruiter.html / verify_student.html / verify_college.html before
// this API existed, so a "fill sample record" click produces the same
// verified/not-found result it always did.

router.post('/recruiter', (req, res) => {
  const { name, designation, company, industry, companySize, email, phone, website, gstin } = req.body || {};

  const missing = missingFields({ name, designation, company, industry, companySize, email, phone, gstin });
  if (missing.length) {
    return res.status(422).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  const gstinNorm = String(gstin).toUpperCase();
  if (!GSTIN_RE.test(gstinNorm)) {
    return res.status(422).json({ error: 'GSTIN format looks invalid' });
  }

  const match = db.getRegistry('recruiter').find(r =>
    r.company.toLowerCase() === String(company).toLowerCase() &&
    r.gstin.toUpperCase() === gstinNorm
  );

  if (!match) {
    return res.json({ verified: false, message: 'No matching recruiter record found for that company and GSTIN.' });
  }

  const record = { ...match, name: name || match.name, designation, companySize, email, phone, website: website || match.website };
  tryLinkUser('recruiter', email, record);
  res.json({ verified: true, record });
});

router.post('/student', (req, res) => {
  const { state, college, roll, email, phone } = req.body || {};

  const missing = missingFields({ state, college, roll, email, phone });
  if (missing.length) {
    return res.status(422).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const match = db.getRegistry('student').find(s =>
    s.college.toLowerCase() === String(college).toLowerCase() &&
    s.roll.toUpperCase() === String(roll).toUpperCase()
  );

  if (!match) {
    return res.json({ verified: false, message: 'No matching student record found for that college and roll number.' });
  }

  const record = { ...match, email, phone };
  tryLinkUser('student', email, record);
  res.json({ verified: true, record });
});

router.post('/college', (req, res) => {
  const { name, designation, state, college, email, phone, website, aishe } = req.body || {};

  const missing = missingFields({ name, designation, state, college, email, phone, aishe });
  if (missing.length) {
    return res.status(422).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  const aisheNorm = String(aishe).toUpperCase();
  if (!AISHE_RE.test(aisheNorm)) {
    return res.status(422).json({ error: 'AISHE code format looks invalid (expected like U-1234 or C-12345)' });
  }

  const match = db.getRegistry('college').find(c =>
    c.college.toLowerCase() === String(college).toLowerCase() &&
    c.aishe.toUpperCase() === aisheNorm
  );

  if (!match) {
    return res.json({ verified: false, message: 'No matching college record found for that college and AISHE code.' });
  }

  const record = { ...match, name: name || match.name, designation, email, phone, website: website || match.website };
  tryLinkUser('college', email, record);
  res.json({ verified: true, record });
});

router.get('/:role/sample', (req, res) => {
  const { role } = req.params;
  if (!['student', 'college', 'recruiter'].includes(role)) {
    return res.status(404).json({ error: 'Unknown role' });
  }
  res.json({ sample: db.getRandomSample(role) });
});

module.exports = router;
