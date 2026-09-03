# SkillBridge API

Backend for the SkillBridge prototype: verification for recruiters, students
and colleges, plus the waitlist / contact / sign-in forms on the homepage.
Node.js + Express, with a small JSON-file datastore (no native modules, no
DB server to install) and JWT auth.

## Run it

```bash
cd server
npm install
cp .env.example .env    # then edit JWT_SECRET before deploying anywhere real
npm start
```

The server listens on `http://localhost:4000` by default (set `PORT` in
`.env` to change it) and **also serves the existing frontend** — `index.html`,
`verify_recruiter.html`, `verify_student.html`, `verify_college.html` — as
static files from the repo root. So once it's running, just open
`http://localhost:4000/` in a browser and everything (forms, fetch calls,
verification) works against the real API on the same origin.

Data lives in `server/data/db.json`, created automatically on first run and
seeded with the same four sample records per role (recruiter / student /
college) that used to be hardcoded in each HTML file's `<script>` tag. Delete
that file to reset to a clean seed.

## Demo login accounts

Three accounts are auto-seeded on first run so the sign-in form has
something to authenticate against (there's no signup UI yet — see below):

| Email | Password | Role |
|---|---|---|
| `demo.recruiter@example.com` | `Demo@1234` | recruiter |
| `demo.student@example.com` | `Demo@1234` | student |
| `demo.college@example.com` | `Demo@1234` | college |

All three start out already `verified: true`, linked to the first registry
record for their role.

## What's wired up

- **`verify_recruiter.html`** — submits to `POST /api/verify/recruiter`;
  "Fill a sample record" pulls from `GET /api/verify/recruiter/sample`; the
  company name datalist loads from `GET /api/registry/companies`.
- **`verify_student.html`** — the state dropdown populates the college
  dropdown live from `GET /api/registry/colleges?state=...`; submits to
  `POST /api/verify/student`; sample fill uses
  `GET /api/verify/student/sample`.
- **`verify_college.html`** — same pattern, posts to
  `POST /api/verify/college`; college name datalist loads from
  `GET /api/registry/colleges` (unfiltered).
- **`index.html` modal** — "Sign In" calls `POST /api/auth/login` and stores
  the returned JWT in `localStorage` (`sb_token`); "Get started" calls
  `POST /api/waitlist` (role + email only, no password — see note below);
  "Contact us" calls `POST /api/contact`.

Successful verification also links back to a real account: if the email
submitted on a verify form matches a signed-up user with the same role,
that user's `verified` flag and profile get updated (`db.markUserVerified`).

## Note on signup vs. waitlist

The "Get started" modal on the homepage only ever collected a role and an
email — no password — so it's wired to `POST /api/waitlist`, a plain lead
capture with no login capability. Full account creation
(`POST /api/auth/signup`, which *does* take a password and returns a JWT
immediately) is implemented and tested, just not wired to any current
frontend form. Add a password field to "Get started" (or a new onboarding
screen) and point it at `/api/auth/signup` when you're ready to turn
waitlist signups into real accounts.

## API reference

All request/response bodies are JSON. Verification endpoints intentionally
respond `200` with `{ "verified": false, "message": "..." }` for a
non-match — a failed lookup is a normal outcome, not an HTTP error. `422` is
used for malformed input (bad GSTIN/AISHE format, missing fields).

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ role, email, password }` | `role` ∈ `student, college, recruiter`. Returns `{ token, user }`. Not yet wired to a frontend form. |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }`. |
| GET | `/api/auth/me` | — (send `Authorization: Bearer <token>`) | Returns `{ user }`. |

### Verification
| Method | Path | Body |
|---|---|---|
| POST | `/api/verify/recruiter` | `{ name, designation, company, industry, companySize, email, phone, website, gstin }` |
| POST | `/api/verify/student` | `{ state, college, roll, email, phone }` |
| POST | `/api/verify/college` | `{ name, designation, state, college, email, phone, website, aishe }` |
| GET | `/api/verify/:role/sample` | — returns `{ sample }`, one random registry record for that role |

### Registry (public, non-sensitive lookups)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/registry/companies` | Company names only, no GSTIN — for the recruiter datalist. |
| GET | `/api/registry/colleges` | College names only. Add `?state=X` to filter — used by the student form's dependent dropdown. |

### Misc
| Method | Path | Body |
|---|---|---|
| POST | `/api/waitlist` | `{ role, email }` |
| POST | `/api/contact` | `{ name, email, message }` |
| GET | `/api/health` | — liveness check |

## Swapping in a real database later

Every route talks to `src/db.js` only — `findUserByEmail`, `createUser`,
`getRegistry`, etc. To move to Postgres/Mongo/whatever, reimplement that
one file with the same exported function signatures; nothing in `routes/`
needs to change.
