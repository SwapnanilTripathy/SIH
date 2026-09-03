// Smoke tests: boot the real app on an ephemeral port and hit it with
// fetch. Run with `npm test` (needs Node 18+ for global fetch).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// db.json is shared with real dev runs, so back it up, let the test run
// build/mutate its own, then restore whatever was there before.
const REAL_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const hadRealDb = fs.existsSync(REAL_DB_PATH);
const realDbBackup = hadRealDb ? fs.readFileSync(REAL_DB_PATH, 'utf8') : null;
if (hadRealDb) fs.rmSync(REAL_DB_PATH);

const app = require('../src/index');

let server;
let base;

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, () => {
      base = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  if (hadRealDb) {
    fs.writeFileSync(REAL_DB_PATH, realDbBackup);
  } else if (fs.existsSync(REAL_DB_PATH)) {
    fs.rmSync(REAL_DB_PATH);
  }
});

test('GET /api/health', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('GET /api/registry/companies', async () => {
  const res = await fetch(`${base}/api/registry/companies`);
  const body = await res.json();
  assert.ok(body.companies.includes('Nimbus Systems'));
});

test('GET /api/registry/colleges?state=Tamil Nadu', async () => {
  const res = await fetch(`${base}/api/registry/colleges?state=${encodeURIComponent('Tamil Nadu')}`);
  const body = await res.json();
  assert.ok(body.colleges.includes('Kestrel University'));
  assert.ok(!body.colleges.includes('Norwood Polytechnic'));
});

test('POST /api/auth/signup then /api/auth/login', async () => {
  const email = `test.${Date.now()}@example.com`;
  const signup = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'student', email, password: 'correcthorse' })
  });
  assert.equal(signup.status, 201);
  const signupBody = await signup.json();
  assert.ok(signupBody.token);
  assert.equal(signupBody.user.passwordHash, undefined);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correcthorse' })
  });
  assert.equal(login.status, 200);
});

test('POST /api/auth/login rejects wrong password', async () => {
  const email = `test2.${Date.now()}@example.com`;
  await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'student', email, password: 'correcthorse' })
  });
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrongpassword' })
  });
  assert.equal(res.status, 401);
});

test('GET /api/auth/me requires a token', async () => {
  const res = await fetch(`${base}/api/auth/me`);
  assert.equal(res.status, 401);
});

test('GET /api/auth/me returns the logged-in user', async () => {
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.student@example.com', password: 'Demo@1234' })
  });
  const { token } = await login.json();
  const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.equal(body.user.role, 'student');
});

test('POST /api/verify/student succeeds for a real record (college+roll only)', async () => {
  const res = await fetch(`${base}/api/verify/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: 'Tamil Nadu',
      college: 'Kestrel University',
      roll: 'kes20me019',
      email: 'devansh.rao@student.edu',
      phone: '9876543210'
    })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.verified, true);
  assert.equal(body.record.name, 'Devansh Rao');
});

test('POST /api/verify/student fails for a made-up record', async () => {
  const res = await fetch(`${base}/api/verify/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: 'Tamil Nadu',
      college: 'Made Up University',
      roll: '00000',
      email: 'nobody@nowhere.com',
      phone: '0000000000'
    })
  });
  const body = await res.json();
  assert.equal(body.verified, false);
});

test('POST /api/verify/recruiter matches on company+GSTIN only', async () => {
  const res = await fetch(`${base}/api/verify/recruiter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Someone Else',
      designation: 'Recruiter',
      company: 'Nimbus Systems',
      industry: 'Cloud Infrastructure',
      companySize: '201–500',
      email: 'someone.else@nimbussystems.com',
      phone: '9123456780',
      gstin: '27abcde1234f1z5'
    })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.verified, true);
  assert.equal(body.record.company, 'Nimbus Systems');
});

test('POST /api/verify/recruiter rejects a malformed GSTIN', async () => {
  const res = await fetch(`${base}/api/verify/recruiter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Person', designation: 'Recruiter', company: 'Nimbus Systems',
      industry: 'Cloud Infrastructure', companySize: '201–500',
      email: 'a@nimbussystems.com', phone: '9123456780', gstin: 'not-a-real-gstin'
    })
  });
  assert.equal(res.status, 422);
});

test('POST /api/verify/college matches on college+AISHE only', async () => {
  const res = await fetch(`${base}/api/verify/college`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Someone Else', designation: 'TPO', state: 'Karnataka',
      college: 'Meridian College of Engineering', email: 'x@meridiancollegeofengineering.edu',
      phone: '9876543210', aishe: 'c-38821'
    })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.verified, true);
});

test('GET /api/verify/student/sample returns a sample record', async () => {
  const res = await fetch(`${base}/api/verify/student/sample`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.sample.email);
});

test('POST /api/contact stores a message', async () => {
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test@example.com', message: 'Hello' })
  });
  assert.equal(res.status, 201);
});
