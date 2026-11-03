# Presentation and viva guide

Team: Atul Suresh (PES1UG24CS098) and Aryan Musale (PES1UG24CS085).

## Before presenting

Start Docker Desktop, extract the complete project and open `START_PROJECT.command`. Keep its Terminal open. Wait for the production server to say it is ready, then open http://localhost:3000. The launcher prepares a fresh synthetic lost/found pair and prints their titles. Existing reports and history remain intact.

Default password: `CampusDemo@2026`, unless changed in `.env` before the first seed. Student: `atul@campus.test`. Staff: `staff@campus.test`.

Open the report, presentation and browser before the evaluation. The PowerPoint has speaker notes. Both students should personally practise the workflow and explain their assigned files. Record actual personal review/modifications in `TEAM_CONTRIBUTIONS.md`.

## Opening explanation

Our project is a Campus Lost & Found Management System. Students can report belongings, search the noticeboard and find possible matches. We keep unique identifying clues private, so another student cannot simply copy them to claim an item. The owner submits private evidence, and staff compare it with the finder's clue before approving the claim. A recorded handover then updates the claim, the found item and the linked lost report together. PostgreSQL protects the recovery workflow, while MongoDB stores flexible item profiles and audit history.

## Slide-by-slide speaking guide

1. **Title:** Introduce both team members and the stack. Describe the project as verified recovery rather than a simple item listing.
2. **Problem and workflow:** Explain why scattered posts and public identifying marks are a problem. Walk through report, match, claim, verify and return.
3. **Architecture:** The browser calls a Next.js backend. PostgreSQL owns workflow state; MongoDB stores profiles/history. SQL events make document delivery retryable.
4. **Relational design:** A user owns reports and submits claims on another user's found report. A claim can link to the claimant's lost report. Unique handover keys prevent a second receipt for the same item or claim.
5. **Advanced SQL:** Point to transactions/locks, views, stored functions, triggers, indexes and full-text search. Explain one feature using the actual recovery problem.
6. **MongoDB:** Category-specific fields differ across objects. Public capacity/model fields and private clues stay separate. Explain how the outbox retries failed writes.
7. **Matching:** Same-category reports qualify as candidates. Scores use category, location, nonempty normalized color, dates and text. A high score helps discovery but does not prove ownership.
8. **Interface:** This is a genuine browser screenshot. Explain the displayed score/reasons and then switch to the live app.
9. **Handover:** Explain the three rows of state changes. One SQL transaction completes all final changes; locks and integrity checks prevent inconsistent ownership.
10. **Tests:** State the actual results: 35 database tests, three unit checks, 20 HTTP checks and 17 browser checks passed. The native concurrent-approval test passed without a skip.
11. **Live demo:** Follow the sequence below. Finish with audit history and SQL queries.

## Live demonstration, approximately six minutes

### Student flow

1. Sign in as `atul@campus.test`. Show Overview and Browse reports. Search for `blue bottle` and demonstrate category/location filters.
2. Open **My reports**. Select **Find matches** for the newest **Demo missing blue bottle** printed by the launcher.
3. Explain its candidate's score and matching reasons. Open the corresponding **Demo blue bottle** found report. Show its public `750 ml` capacity. The finder's private clue is absent from this student view.
4. In the ownership form, enter the synthetic evidence `AS engraved beneath the base.` Select the matching newest Demo missing blue bottle under **Link your lost report**, then submit.
5. Open **My claims** and show the pending claim. Explain that submitting a claim does not reserve or return the item.

### Staff flow

6. Sign out and sign in as `staff@campus.test`.
7. Open **Verification desk**, locate the new demo claim and select **View item details**. Show the private identifying clue and compare it with the claimant's evidence. Close the detail window.
8. Select **Approve claim** and enter a review reason such as `Engraved initials verified with the claimant in person.` Confirm. The claim becomes approved and the found item becomes reserved.
9. Select **Complete handover** and enter a receipt note such as `Verified owner collected the bottle at the helpdesk.` Confirm. The claim becomes handed over and the item becomes returned.
10. Sign back in as Atul if needed and show the linked lost report is closed. Staff can show **Activity log** and grouped event counts.

If the pair has already been returned during rehearsal, restart the launcher or run `npm run demo:prepare` in a second Terminal inside the project folder. This creates a fresh pair without erasing history. An existing active claim cannot be submitted twice.

### Database demonstration

In another Terminal inside the project folder:

```bash
npm run demo:queries
```

Explain the directory JOIN, busy-location GROUP BY/HAVING, unclaimed-item subquery, category summary view, full-text search, stored matching function and pending outbox query. The DDL section uses a temporary demonstration table for CREATE/ALTER/DROP and DML; it does not drop application tables.

## Questions ma'am may ask

**Why use PostgreSQL?** Users, reports, claims and receipts have clear relationships. Foreign keys, constraints, transactions and row locks protect a workflow in which each found item must have at most one verified owner.

**Why use MongoDB as well?** Category-specific descriptors vary, such as capacity for a bottle and model for a device. MongoDB provides flexible profiles with validation, document indexes and grouped audit aggregation. The database choice follows the data shape.

**Which database is authoritative?** PostgreSQL decides identity, ownership and workflow state. MongoDB holds profile and audit projections. A failed MongoDB write cannot silently turn an unapproved claim into an approved one.

**Is this a distributed transaction across both databases?** No. PostgreSQL commits its workflow and event together. The dispatcher then updates MongoDB. The two stores become consistent through retryable delivery.

**What happens when MongoDB is unavailable?** The SQL report can still commit with a queued event. The response indicates that document synchronization is pending. Restoring MongoDB and retrying delivery creates the missing profile/audit records.

**Why do you need an outbox table?** Without it, a crash between the SQL change and the MongoDB write could lose the document update. The outbox records the intended delivery in the same SQL transaction as the report change.

**How do retries avoid duplicate audit events?** The SQL event sequence number is the MongoDB audit document key. Replaying the same event uses an idempotent update. Profile event versions also prevent an older update replacing a newer one.

**How do you prevent two owners?** Staff review locks the found item before reviewing the claim. The partial unique ownership index and deferred consistency checks reinforce the rule. A native test issued competing approval requests and verified exactly one successful owner.

**What does atomic handover mean?** Receipt creation, claim completion, found-item return and linked-lost-report closure either commit together or roll back together.

**What is a deferred trigger?** It checks the final state at transaction commit. Intermediate steps inside handover are permitted, while an inconsistent final item/claim state is rejected.

**What is a partial unique index?** It enforces uniqueness only for rows meeting a condition. One index limits active claims per item/user; another limits approved or completed ownership to one claimant per found item.

**How does matching work?** Candidates must be open found reports in the same category from a different reporter. The score awards up to 35 category, 20 location, 15 color, 15 date and 15 text points. It returns at most twelve candidates. The SQL function returns reasons along with the score.

**Does a 90-point match prove ownership?** No. The score is a relevance heuristic. Staff still check private evidence. The weights have not been calibrated on real campus-labelled matches.

**How is full-text search different from simple substring search?** PostgreSQL builds an English `tsvector` from report text and searches it with text queries. A GIN index supports lookup, and text ranking contributes to the candidate score. The small dataset does not establish a measured performance improvement.

**How is privacy enforced?** Backend services expose the private identifying clue only to its reporter and staff. Claim lists expose evidence only to the claimant or staff. Hiding a UI button is not treated as authorization.

**How are passwords stored?** A random salt and scrypt produce a password hash. SQL stores the hash, not the plaintext password. A login creates a random session token, and the database stores its SHA-256 digest with expiry.

**Can registration create a staff account?** No. The backend inserts the student role regardless of a submitted role field. Staff provision occurs through trusted setup.

**How do you prevent SQL injection?** Query values use bound parameters. Dynamic directory filters use a fixed allowed-key list. The HTTP suite also sends SQL-looking search text and confirms it remains harmless input.

**What SQL validation exists?** Primary/foreign keys, CHECK constraints, partial uniqueness, role/claim guards, handover guards and deferred item/claim consistency checks. Application validation adds earlier feedback; it does not replace database validation.

**What NoSQL validation exists?** MongoDB JSON Schema requires the document identity, public object, private string and event version. Public descriptors must be strings with bounded length. The backend also limits field count, reserved names, key/value lengths and photo type/size.

**What is new in the final version?** Same-category matching, case/space-normalized colors, category-specific public fields, preservation of flexible fields during edits, stronger profile validation, cleanup of client state on logout, stable calendar-date formatting, security patch update, launch scripts and complete browser/native evidence.

**How do the tests avoid deleting demonstration data?** The suites require an explicit opt-in and SQL/MongoDB database names ending in `_test`. They reset dedicated test databases. The browser suite has its own separate seeded databases.

**What are the limitations?** The data is synthetic, ranking is heuristic, and no email/SMS or image recognition is implemented. Directory results are capped at 150, matches at twelve and photos at 600 KB. A remote production deployment would need its own operational configuration and validation.

## File map for explanation

| File | What to explain |
|---|---|
| db/schema.sql | Tables, constraints, views, functions, indexes and triggers |
| db/queries.sql | Course DDL/DML and advanced query examples |
| lib/service.mjs | Report ownership, claims, matching, staff review and handover |
| lib/projection.mjs | MongoDB validation, audit aggregation and outbox retries |
| lib/auth.mjs | Password hashing, sessions and throttling |
| lib/descriptors.mjs | Category-specific fields, safe edit attributes and date display |
| app/api/[...path]/route.js | Backend routes, Origin checks, session and role enforcement |
| app/page.jsx | Student/staff UI and client state |
| tests/integration.test.mjs | Native database/service cases, including concurrent approval |
| tests/http.mjs | Actual production HTTP checks |
| tests/browser.mjs | Real UI workflow, screenshots and mobile checks |

## Troubleshooting during rehearsal

- **Docker unavailable:** Start Docker Desktop and rerun the launcher after its engine is ready.
- **Port 3000 busy:** Stop the previous app Terminal with Ctrl+C, then rerun the launcher. Do not change the browser port without also updating APP_ORIGIN.
- **Login fails after changing the demo password:** Existing seed accounts keep their hashes. Use the password from their initial setup rather than assuming a later environment edit changed them.
- **A claim already exists:** Open My claims, or use a fresh pair from `npm run demo:prepare`.
- **Item details pending:** Start both databases and run `npm run db:sync`, or use staff Retry synchronization.
- **Git says not a repository:** The downloaded ZIP is a source package. Use an existing Git checkout for Git commands. The launcher works directly from the extracted folder.
