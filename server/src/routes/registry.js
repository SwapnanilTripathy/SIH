const express = require('express');
const db = require('../db');

const router = express.Router();

// Powers the company datalist on recruiter.html
router.get('/companies', (req, res) => {
  res.json({ companies: db.getCompanies() });
});

// Powers the college datalist on verify_student.html / college.html.
// ?state=West Bengal narrows it to that state, matching the dependent
// state -> college dropdown behavior already built into the frontend.
router.get('/colleges', (req, res) => {
  const { state } = req.query;
  res.json({ colleges: db.getColleges(state) });
});

module.exports = router;
