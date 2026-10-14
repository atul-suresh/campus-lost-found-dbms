# Campus Lost & Found Management System

A DBMS Level 3 project for a two-member team at PES University. It combines a **Next.js 16** interface, **PostgreSQL** transactional workflows and **MongoDB** flexible item profiles and audit history.

Team: Atul Suresh (PES1UG24CS098), Aryan Musale (PES1UG24CS085). Demo account names are illustrative and are not proof of individual contributions.

## What it does

- Student registration, password sign-in, 12-hour server-side sessions and staff authorization.
- Lost/found reports, optional photos, categories, locations, filters and indexed full-text search.
- Ranked candidates for a student's lost reports, with transparent matching reasons.
- Private identifying marks visible only to the reporter and staff. Claim evidence visible only to claimant and staff.
- Staff verification, one approved owner per item, and in-person handover receipts.
- A handover returns the found item and closes the linked lost report atomically.
- SQL dashboard views and MongoDB audit aggregation.
- Transactional outbox with retry, ordered dispatch and idempotent MongoDB writes.

Matching is a weighted database ranking, **not an AI ownership decision**. Staff must verify evidence before handover. All included item records are synthetic demonstration data.

## Quick start on macOS, Windows or Linux

Install Node.js **20.9 or newer** and Docker Desktop (start it before the next commands). Unzip the project and open Terminal in this folder.

```bash
cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:setup
npm run dev
```

Open **http://localhost:3000**. Windows PowerShell users can replace the first command with `Copy-Item .env.example .env`. Keep the terminal running. For a production demonstration, use `npm run build` followed by `npm start` instead of `npm run dev`.

The SQL schema and seed script are idempotent: repeating setup creates missing structures/accounts without overwriting existing item reports. Setup intentionally fails when a required database is unavailable.

### Demo sign-in

The password is the value of `DEMO_PASSWORD` in your local `.env` (example: `CampusDemo@2026`). The actual source contains password hashes only, generated with scrypt; the seed reads the password from the environment.

| Email | Role | Demo identity |
|---|---|---|
| atul@campus.test | Student | Atul Suresh |
| student085@campus.test | Student | Aryan Musale |
| student@campus.test | Student | Demo Student |
| staff@campus.test | Staff | Campus Helpdesk |

There are 24 synthetic reports, 7 categories, 6 locations, 4 accounts and 3 claims. One claim starts pending, one approved/reserved, and one handed over/returned. These are deliberately seeded sample workflows, not real campus incidents.

## Demo in six minutes

1. Sign in as Atul. Browse reports, filter by category/location and search `blue bottle`.
2. Open My reports and choose Find matches for the blue bottle. Explain the score and why it cannot prove ownership.
3. Open an eligible found item. Submit specific private ownership evidence and link an open lost report.
4. Sign out; sign in as staff. In Verification desk, view the item identifying detail, compare evidence, and approve with a reason.
5. Complete handover with a receipt note. Show that item and claim states change and the linked lost report closes.
6. Show Overview and Activity log; run `npm run demo:queries`. Explain SQL views, constraints, functions, indexes and the MongoDB aggregation pipeline.

Use a **new found report** for a clean demonstration because some seed claims already exist. The pending blue bottle claim can also be reviewed directly.

## Files

| Path | Purpose |
|---|---|
| `app/page.jsx`, `app/globals.css` | Responsive Next.js interface |
| `app/api/[...path]/route.js` | Backend authentication, input checks and role-based API |
| `lib/service.mjs` | Database workflows and ownership checks |
| `lib/auth.mjs` | scrypt hashing, sessions and login throttling |
| `lib/projection.mjs` | MongoDB validators, indexes, audit aggregation and outbox dispatch |
| `db/schema.sql` | DDL, real ALTER migration, triggers, functions, views and indexes |
| `db/queries.sql` | Important queries and safe CREATE/ALTER/DROP demonstration |
| `scripts/seed.mjs` | Reproducible synthetic data |
| `tests/` | Database/service and HTTP integration checks |
| `docs/` | ER diagram, architecture, data dictionary, report, viva and team guide |
| `evidence/` | Actual recorded test/query outputs and verification limits |

## Data model

PostgreSQL is authoritative for users, sessions, categories, locations, reports, claims, handovers and event delivery state. MongoDB serves `item_profiles` with public attributes/optional photo/private identifying detail, and `audit_events` for staff history. The SQL outbox temporarily carries profile changes; delivered payloads are cleared, and private identifying details are never copied into the audit collection.

Public report fields can be normalized and joined. Category-dependent descriptors and photos vary across items, so MongoDB stores their flexible shape. SQL transactions cannot atomically commit to MongoDB: the outbox makes document consistency **eventual**, with explicit pending status and retry. The implementation does not claim a cross-database ACID transaction.

Found item: open → reserved → returned. Lost report: open → closed. Claims: pending → approved/rejected/withdrawn; approved → handed_over. Only staff can approve or hand over. Deleting reports is limited to open reports without any claim history.

## Advanced features

SQL: transactions and row locking; filtered aggregate views; stored matching/review/handover functions; audit and integrity triggers; partial unique/composite/GIN indexes; generated tsvector full-text search; deferred consistency checks. NoSQL: strict collection validation, compound indexes, aggregation with `$match`, `$group` and `$sort`, and idempotent projection updates.

## Retry document synchronization

```bash
npm run db:sync
# Optional background retry worker; leave this terminal running:
npm run db:sync -- --watch
```

Staff can also use Retry synchronization in the UI. A document failure leaves events queued in PostgreSQL. A singleton advisory lock prevents out-of-order dispatch by competing workers. A MongoDB event ID prevents duplicate audit records on replay. Application startup does not replace or fake either database.

## Tests on native PostgreSQL and MongoDB

Tests **reset their dedicated test databases**. They require an opt-in flag and `_test` database names. They refuse the normal demo database. First create the SQL test database:

```bash
docker compose exec postgres createdb -U campus campus_lost_found_test
cp .env .env.test
```

Edit `.env.test` so these values match (keep the same demo password):

```dotenv
DATABASE_URL=postgresql://campus:campus_local_password@localhost:5432/campus_lost_found_test
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=campus_lost_found_test
ALLOW_TEST_DATABASE=true
```

Then run:

```bash
node --env-file=.env.test --test --test-reporter=tap --test-concurrency=1 tests/integration.test.mjs
npm run build
node --env-file=.env.test tests/http.mjs
```

The HTTP checks start and stop their own production server on port 3100. Do not run tests against the demo data. `createdb` may report that the test database already exists on a second run; reuse it.

The supplied verification used **PostgreSQL through PGlite** plus **native MongoDB 8.0.15** because this execution environment could not install native PostgreSQL. The native simultaneous-approval test is included but skipped in that verification. Run the commands above on your laptop to obtain the native concurrency result. See `evidence/verification.json` for the exact engine versions and limitations. Browser UI tests and screenshots are pending local capture; no fabricated screenshots are included.

## Screenshot evidence

See `docs/SCREENSHOTS.md`. Capture the actual running app on your laptop and place the images in `evidence/screenshots/`. The report generator uses these files if available. Its source is included for regeneration after team details and screenshots are added.

## GitHub submission

Public repository: [atul-suresh/campus-lost-found-dbms](https://github.com/atul-suresh/campus-lost-found-dbms). This package contains the source, report and test evidence prepared for that repository. To perform the initial upload from your Mac, run `bash scripts/publish-github.sh`; it uses your own GitHub CLI login and preserves the starter commit. Clone/update and team contribution instructions are in `docs/GITHUB_AND_TEAM.md`. Local environment files, database volumes and build/dependency directories are excluded from version control.

Both members must make and understand their own meaningful database/application changes, then commit under their own identities. A suggested responsibility split is provided; it is **not a claim that those contributions have already happened**.

## Configuration and limits

- Keep `APP_ORIGIN` equal to the origin you use in the browser. Change it if you change host or port. Mutation requests require a matching Origin header.
- Use HTTPS and `COOKIE_SECURE=true` for a remote deployment. Replace local passwords and use authenticated MongoDB before remote hosting. The compose databases bind only to your laptop's loopback interface.
- Demo staff is seeded by setup. Registration always creates students even if a caller submits a role field. Staff accounts should be provisioned by a trusted operator.
- Public descriptions/photos must omit private identity details. Evidence must be checked in person; this is not identity automation.
- Maximum 150 directory results, 12 ranked candidates, 600 KB photos and 10 flexible string attributes per report. There is no file/object-storage dependency.
- No email/SMS notification or image recognition is claimed. Matching uses SQL text and metadata.
- Logs contain error classes/codes rather than evidence/passwords. Sessions expire in the backend; there is no browser-only authorization.

## Stop and resume

```bash
docker compose stop
# Later:
docker compose start
npm run dev
```

Database volumes retain your work. `docker compose down -v` deletes the local volumes; use it only when you intentionally want to erase the demonstration databases.
