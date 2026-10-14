# Start here

This package contains the implemented Campus Lost & Found DBMS project, its PDF report, diagrams, synthetic dataset, SQL/MongoDB setup, 31 database test cases, 20 HTTP checks and viva/demo guidance.

## Run

Start Docker Desktop. Open Terminal inside this project folder:

```bash
cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:setup
npm run dev
```

Open http://localhost:3000. Student: `atul@campus.test`; staff: `staff@campus.test`. Password: the `DEMO_PASSWORD` in `.env` (example `CampusDemo@2026`). The README explains the other demo accounts and every command.

## Submission files

- Report: `docs/Campus_Lost_Found_Report.pdf`.
- Public repository: https://github.com/atul-suresh/campus-lost-found-dbms.
- Viva: `docs/VIVA_AND_DEMO.md`.

## Recorded verification

Production build passed; 30 database/service cases passed; 20 HTTP checks passed. One native concurrency case was skipped because the available PostgreSQL engine was PGlite. Native MongoDB 8.0.15 was used. Raw outputs are in `evidence/`.

## Finish these local/team steps

1. Confirm section/title approval with the instructor. Team details are Atul Suresh (PES1UG24CS098) and Aryan Musale (PES1UG24CS085).
2. Run native PostgreSQL tests using the README, including simultaneous approvals.
3. Capture the actual running UI screenshots using `docs/SCREENSHOTS.md`; regenerate and review the PDF.
4. Both members make, verify and commit their own meaningful modifications. Record genuine contributions; the suggested split is not completed evidence.
5. Upload the project from your Mac using `bash scripts/publish-github.sh`, then keep the public repository updated with tested team modifications. Its URL is recorded in `docs/team.json`.

The source implementation is prepared and the public repository has been created. Initial source upload, local verification and final team evidence remain.
