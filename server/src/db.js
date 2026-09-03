// Small JSON-file datastore. No native modules, no DB server to install.
//
// Every route talks only to the functions exported here — to swap in a real
// database later (Postgres/Mongo/whatever), reimplement this one file with
// the same exported function signatures and nothing in routes/ needs to
// change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// These match the STUDENT_RECORDS / RECRUITER_RECORDS / COLLEGE_RECORDS
// arrays that were already hardcoded into verify_student.html,
// verify_recruiter.html and verify_college.html, so wiring those pages to
// this API doesn't change what "fill sample record" or a real match looks
// like. Email/website are derived the same way those pages' "fill sample"
// buttons already generate them.
const SEED = {
  users: [],
  registry: {
    student: [
      { id: 's1', name: 'Aarav Menon', state: 'Maharashtra', college: 'Ashgrove Institute of Technology', roll: 'ASH21CS104', batch: 'B.Tech CSE · 2026', email: 'aarav.menon@student.edu' },
      { id: 's2', name: 'Priya Nair', state: 'Karnataka', college: 'Meridian College of Engineering', roll: 'MER22EC088', batch: 'B.Tech ECE · 2027', email: 'priya.nair@student.edu' },
      { id: 's3', name: 'Devansh Rao', state: 'Tamil Nadu', college: 'Kestrel University', roll: 'KES20ME019', batch: 'B.Tech ME · 2025', email: 'devansh.rao@student.edu' },
      { id: 's4', name: 'Sana Iyer', state: 'Delhi (NCT)', college: 'Norwood Polytechnic', roll: 'NOR23IT051', batch: 'Diploma IT · 2026', email: 'sana.iyer@student.edu' }
    ],
    recruiter: [
      { id: 'r1', name: 'Meera Kulkarni', designation: 'Talent Acquisition Lead', company: 'Nimbus Systems', industry: 'Cloud Infrastructure', gstin: '27ABCDE1234F1Z5', email: 'meera@nimbussystems.com', website: 'https://nimbussystems.com' },
      { id: 'r2', name: 'Rohan Bhatt', designation: 'HR Manager', company: 'Loom Robotics', industry: 'Robotics & Hardware', gstin: '29PQRST5678G1Z2', email: 'rohan@loomrobotics.com', website: 'https://loomrobotics.com' },
      { id: 'r3', name: 'Fatima Sheikh', designation: 'Founder', company: 'Arclight Analytics', industry: 'Data & Analytics', gstin: '07LMNOP9012H1Z8', email: 'fatima@arclightanalytics.com', website: 'https://arclightanalytics.com' },
      { id: 'r4', name: 'Karthik Subramaniam', designation: 'HR Business Partner', company: 'Vantage Retail', industry: 'E-commerce & Retail', gstin: '33XYZAB3456I1Z4', email: 'karthik@vantageretail.com', website: 'https://vantageretail.com' }
    ],
    college: [
      { id: 'c1', name: 'Sunita Deshmukh', designation: 'Training & Placement Officer', state: 'Maharashtra', college: 'Ashgrove Institute of Technology', aishe: 'C-41522', email: 'sunita@ashgroveinstituteoftechnology.edu', website: 'https://ashgroveinstituteoftechnology.edu' },
      { id: 'c2', name: 'Arjun Reddy', designation: 'Dean of Placements', state: 'Karnataka', college: 'Meridian College of Engineering', aishe: 'C-38821', email: 'arjun@meridiancollegeofengineering.edu', website: 'https://meridiancollegeofengineering.edu' },
      { id: 'c3', name: 'Lakshmi Iyer', designation: 'Head, Placement Cell', state: 'Tamil Nadu', college: 'Kestrel University', aishe: 'U-0642', email: 'lakshmi@kestreluniversity.edu', website: 'https://kestreluniversity.edu' },
      { id: 'c4', name: 'Vikram Chauhan', designation: 'Placement Coordinator', state: 'Delhi (NCT)', college: 'Norwood Polytechnic', aishe: 'C-27390', email: 'vikram@norwoodpolytechnic.edu', website: 'https://norwoodpolytechnic.edu' }
    ]
  },
  waitlist: [],
  contacts: []
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// --- Users -----------------------------------------------------------

function findUserByEmail(email) {
  const db = readDb();
  return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function findUserById(id) {
  const db = readDb();
  return db.users.find(u => u.id === id) || null;
}

function createUser({ role, email, passwordHash, verified = false, profile = null }) {
  const db = readDb();
  const user = {
    id: 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    role,
    email,
    passwordHash,
    verified,
    profile,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);
  return user;
}

function markUserVerified(email, role, profileRecord) {
  const db = readDb();
  const user = db.users.find(
    u => u.email.toLowerCase() === String(email).toLowerCase() && u.role === role
  );
  if (!user) return null;
  user.verified = true;
  user.profile = profileRecord;
  writeDb(db);
  return user;
}

// --- Registry ----------------------------------------------------------

function getRegistry(role) {
  const db = readDb();
  return db.registry[role] || [];
}

function getRandomSample(role) {
  const list = getRegistry(role);
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function getCompanies() {
  const db = readDb();
  return db.registry.recruiter.map(r => r.company);
}

function getColleges(state) {
  const db = readDb();
  const set = new Set();
  [...db.registry.student, ...db.registry.college].forEach(rec => {
    if (!state || rec.state === state) set.add(rec.college);
  });
  return Array.from(set);
}

// --- Waitlist / contact --------------------------------------------------

function addWaitlist(entry) {
  const db = readDb();
  const item = { id: 'w_' + Date.now().toString(36), ...entry, createdAt: new Date().toISOString() };
  db.waitlist.push(item);
  writeDb(db);
  return item;
}

function addContact(entry) {
  const db = readDb();
  const item = { id: 'ct_' + Date.now().toString(36), ...entry, createdAt: new Date().toISOString() };
  db.contacts.push(item);
  writeDb(db);
  return item;
}

// --- Seeding -------------------------------------------------------------

// Seeds the three demo login accounts (recruiter/student/college) the first
// time the DB is created, each linked to the first registry record for
// their role and already verified. No-ops once any user exists, so it never
// clobbers real signups.
function seedDemoAccounts(hashFn) {
  const db = readDb();
  if (db.users.length > 0) return;
  const demo = [
    { role: 'recruiter', email: 'demo.recruiter@example.com' },
    { role: 'student', email: 'demo.student@example.com' },
    { role: 'college', email: 'demo.college@example.com' }
  ];
  demo.forEach(d => {
    const record = db.registry[d.role][0];
    db.users.push({
      id: 'demo_' + d.role,
      role: d.role,
      email: d.email,
      passwordHash: hashFn('Demo@1234'),
      verified: true,
      profile: record,
      createdAt: new Date().toISOString()
    });
  });
  writeDb(db);
}

module.exports = {
  ensureDb,
  readDb,
  writeDb,
  findUserByEmail,
  findUserById,
  createUser,
  markUserVerified,
  getRegistry,
  getRandomSample,
  getCompanies,
  getColleges,
  addWaitlist,
  addContact,
  seedDemoAccounts
};
