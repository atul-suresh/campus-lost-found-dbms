# Campus Lost & Found Management System

DBMS Experiential Learning - Level 3, PES University.

**Atul Suresh - PES1UG24CS098**<br/>
**Aryan Musale - PES1UG24CS085**

A Next.js application with PostgreSQL transactions and MongoDB document profiles/audit history. It supports lost/found reports, private ownership claims, explainable matching, staff approval and recorded handover. All supplied records are synthetic.

## Start the presentation demo on your Mac

1. Install Node.js 20.9 or newer and Docker Desktop. Start Docker Desktop and wait until its engine runs.
2. Extract the complete ZIP. In Finder, open the extracted `Campus_Lost_Found` folder.
3. Control-click `START_PROJECT.command`, choose Open, and leave its Terminal running.
4. Open http://localhost:3000.

If macOS opens the command file as text, open Terminal, type `bash `, drag `START_PROJECT.command` into Terminal, then press Enter. The launcher changes into the correct folder automatically, prepares the databases, adds a fresh synthetic lost/found pair for rehearsal, and builds/starts the app. It prints the report titles and demonstration steps.

| Account | Role |
|---|---|
| atul@campus.test | Student |
| student085@campus.test | Student |
| student@campus.test | Student |
| staff@campus.test | Staff |

Default local demonstration password: **CampusDemo@2026**. If you change `DEMO_PASSWORD` in `.env`, do so before the first seed. Existing account hashes are preserved on repeated setup.

For an existing checkout, run `bash scripts/start-demo.sh` from the project folder. Stop the web server with Ctrl+C. `docker compose stop` stops the databases while preserving their volumes. Re-running the launcher preserves existing reports. Do not remove volumes unless you intend to erase the demonstration data.

## Submission and presentation files

- `docs/Campus_Lost_Found_Report.pdf`: complete project report with actual screenshots and test results.
- `docs/Campus_Lost_Found_Presentation.pptx`: presentation with speaker notes.
- `docs/PRESENTATION_AND_VIVA.md`: speaking guide, demo sequence, questions and troubleshooting.
- `docs/TEAM_CONTRIBUTIONS.md`: component ownership and an honest individual-review record.
- Repository: https://github.com/atul-suresh/campus-lost-found-dbms.

## Publish the final source

This repository contains the final application, report, presentation, screenshots and verification records. `PUBLISH_TO_GITHUB.command` can synchronize an extracted package using your own `atul-suresh` GitHub login. It validates package checksums, preserves repository history, accepts an already-published package and stops on conflicting later changes. Local configuration, dependencies and database data are excluded.

## Main workflow

Students report items, filter/search the noticeboard and view suggestions for their own open lost reports. A claimant submits private evidence and can link their lost report. Staff compare the evidence with the finder's private identifying detail, approve/reject the claim, and record in-person handover. A single SQL transaction creates the receipt, returns the found item, completes the claim and closes its linked lost report.

Matching considers same-category candidates only, then ranks category, location, normalized nonempty color, date proximity and full-text overlap. Scores range from 0 to 100 and provide explanations. Staff verification establishes ownership.

Category-specific public fields include device model, bottle capacity and clothing size. MongoDB stores these flexible descriptors, optional photos and a separate private identifying clue. Editing preserves existing descriptors. Students can read their own evidence; staff can read the evidence required for verification.

## Database design and advanced features

PostgreSQL is authoritative for users, sessions, categories, locations, item reports, claims, handovers and delivery state. It provides foreign keys, CHECK constraints, partial unique indexes, generated full-text vectors, views, PL/pgSQL functions, row locks, deferred integrity triggers and transactional outbox events.

MongoDB provides flexible `item_profiles`, strict document validation, compound indexes, `audit_events`, aggregation and idempotent projection updates. SQL and MongoDB consistency is eventual. An SQL outbox retains failed document changes for later retry, and delivered private payloads are cleared. This is not a cross-database ACID transaction.

See `db/schema.sql`, `db/queries.sql`, `docs/DATA_DICTIONARY.md`, and the ER/architecture diagrams.

## Recorded verification

Executed on 29 October 2026:

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Database/service integration | 35 | 0 | 0 |
| Formatting and attribute handling | 3 | 0 | 0 |
| Production HTTP integration | 20 | 0 | 0 |
| Chromium browser workflow | 17 | 0 | 0 |

The production build passed with Next.js 16.4.3. `npm audit` reported zero known JavaScript dependency vulnerabilities at verification time. Nine genuine browser screenshots cover desktop and mobile views. Native simultaneous approval, rollback, MongoDB failure/recovery, privacy and atomic handover were exercised. Exact engine versions and the container runtime note are in `evidence/verification.json`; machine-readable results are in `evidence/`.

Submission cleanup reviewed on 3 November 2026: the production build, unit checks and dependency audit were rechecked successfully. The database, HTTP and browser evidence above retains its original execution date.

The seed has 24 reports, four accounts, seven categories, six locations and three sample claims. Integration/browser suites add their own synthetic records in separate databases. Test records do not represent campus activity.

## Reproduce verification

The **Verify application and databases** GitHub Actions workflow runs all four suites against standard upstream PostgreSQL 17.6 and MongoDB 8.0.15 services. It runs for application changes and can also be started manually from Actions. Each run saves its logs, machine-readable results and nine browser screenshots as a downloadable artifact.

Start Docker Desktop, then run `VERIFY_PROJECT.command` or:

```bash
npm ci
bash scripts/verify.sh
```

This prepares `.env.test` and `.env.browser`. The database suite resets only explicitly opted-in SQL/MongoDB databases whose names end in `_test`. It leaves the normal demonstration databases intact.

To rerun the browser workflow and refresh screenshots after the core verification:

```bash
npx playwright install chromium
npm run test:browser
```

Browser tests reset their dedicated `campus_lost_found_browser_test` databases, start a production server on port 3200, run the real workflow and save screenshots. The HTTP suite starts its own server on port 3100. Keep these ports free. A custom Chromium executable can be supplied through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

To run queries against the normal demo or retry pending document delivery:

```bash
npm run demo:prepare
npm run demo:queries
npm run db:sync
```

## Regenerate the report

```bash
python3 -m venv .report-venv
.report-venv/bin/python -m pip install reportlab
.report-venv/bin/python scripts/generate_report.py
```

The generator reads the actual TAP/HTTP/browser evidence and screenshot files. It does not convert skipped tests into passes. Review the generated PDF after changes.

## Configuration and scope

Configuration belongs in `.env`; only `.env.example` is committed. The local compose services bind to loopback. Mutation requests require the configured `APP_ORIGIN`, sessions use HttpOnly/SameSite cookies and password hashes use scrypt. Student registration cannot create staff accounts.

Limits: 150 directory rows, 12 matching candidates, ten flexible string attributes per report and a 600 KB photo. Matching uses heuristic SQL text/metadata ranking. Email notifications, image recognition and real campus integration are outside this implementation. Remote deployment requires its own HTTPS, database access controls, operational configuration and validation.
