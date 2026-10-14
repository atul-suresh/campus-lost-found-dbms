# Viva preparation and demonstration

## 30-second explanation

Our system helps students recover lost belongings through report discovery, ranked matching, private ownership evidence, staff verification and a recorded handover. PostgreSQL protects relationships and workflow consistency. MongoDB holds flexible item profiles and audit documents. SQL transactions keep claim approval and handover atomic, while a transactional outbox retries document updates when MongoDB is unavailable. A matching score suggests candidates; it never decides ownership.

## Why it goes beyond CRUD

CRUD stores reports. This system also matches reports, blocks duplicate active claims, serializes competing approvals, rejects other pending claims when ownership is verified, records unique handovers, closes the linked lost report, separates private evidence by role, aggregates activity and recovers document delivery after failure.

## Important questions

**Why PostgreSQL?** Reports, users, claims and handovers have explicit relationships. Foreign keys, CHECK constraints, filtered unique indexes and transactions enforce them. `FOR UPDATE` locks a found item before reviewing a claim. Deferred triggers check the final multi-row state at commit.

**Why MongoDB as well?** A keyring, textbook and electronic device have different descriptors. `item_profiles` stores flexible string attributes, an optional photo and a private identifying clue. The document store also supports staff audit aggregation. Credentials and ownership workflow state remain in SQL. This choice fits different data needs rather than using two databases for the same authoritative record.

**What are the advanced SQL features?** Transactions/row locks; views with filtered aggregates; stored PL/pgSQL review/handover functions; stored SQL matching; ordinary and deferred triggers; GIN/composite/partial indexes; generated tsvector full-text search. Be ready to locate each in `db/schema.sql`.

**What is the advanced NoSQL feature?** `audit_events.aggregate()` groups actions and counts them with `$match`, `$group`, `$sum`, `$max` and `$sort`. Collection validators and compound indexes also execute during setup.

**How is matching computed?** Category 35 points, location 20, nonempty equal color 15, date proximity up to 15, SQL text rank up to 15. The maximum is 100. Candidates below 35 are excluded and the best 12 are returned. Only open found reports from another reporter can match an open lost report. This deterministic score has not been evaluated on a real labelled campus dataset.

**Why not automatically approve the top match?** Similar category, place and description do not prove ownership. Only the true owner should know private marks or contents. Staff compare that evidence and verify the person before handover.

**What is a partial unique index?** `one_live_claim_per_user` permits historical rejected/withdrawn claims while preventing duplicate pending/approved/handed-over claims for the same user/item. `one_owner_per_item` permits at most one approved or completed ownership claim for each item.

**What happens when two staff approve at once?** Both functions attempt to lock the same item row. The first verifies one claim, reserves the item and rejects other pending claims. After waiting, the second sees the changed state and fails. The unique owner index provides another safeguard. The native concurrency test is included; the supplied PGlite verification skips it because PGlite is not a native multi-connection server.

**What is the transaction boundary for a handover?** The stored function validates staff and claim/item state, inserts a unique receipt, updates the claim and found item, and closes a linked lost report. A failure rolls back the whole statement transaction. Deferred integrity triggers reject impossible final states.

**What is the outbox problem?** PostgreSQL and MongoDB cannot commit one ordinary transaction together. A report plus an event commit in PostgreSQL. A worker applies the event to MongoDB and then marks it delivered. If MongoDB fails, SQL still holds the event for retry. If the worker crashes after MongoDB write, replay uses the same unique event ID, so audit records do not multiply.

**Is the system strongly consistent across databases?** No. SQL workflows are transactional; MongoDB is eventually consistent. The interface warns when supplemental details are pending. Claim review should wait for private details when they are needed.

**Why use an advisory lock in dispatch?** One worker dispatches events at a time to keep profile update/delete ordering. `FOR UPDATE SKIP LOCKED` protects queued rows. A profile version check also avoids overwriting newer details with an older profile event.

**Where is validation implemented?** HTML constraints help usability; backend checks enforce type, size, date and allowed values; SQL CHECK/FK/unique constraints enforce relational integrity; MongoDB JSON Schema validators enforce document shape. Backend authorization does not rely on hidden buttons.

**How are passwords and sessions handled?** scrypt derives a salted password hash. A random token is set in an HttpOnly, SameSite cookie. SQL stores only its SHA-256 hash, user and expiry. Requests authenticate the token server-side. The backend checks a matching request Origin for mutation requests. Repeated bad sign-ins trigger a temporary block.

**Why do some operations use DELETE while others retain history?** Unclaimed open reports may be deleted, along with their profile. Reports that have claims or handovers retain history; deletion is refused. Students can withdraw pending claims without deleting evidence of the workflow.

**Does an index always make the sample query faster?** No. PostgreSQL may choose a sequential scan for 24 rows. Explain the access pattern and show the index definition; do not invent a speedup benchmark.

**What data did you use?** Twenty-four clearly labelled synthetic reports, four demo accounts, seven categories and six locations. No real university incident or identity data was supplied. Tests add isolated test records and do not pretend those records are campus evidence.

**What has actually been verified?** Read `evidence/test_results.tap`, `evidence/http_results.json` and `evidence/verification.json`. The production build, PostgreSQL-engine service tests and native MongoDB checks were executed. Native PostgreSQL concurrency and browser UI screenshot capture are local follow-up checks. Test totals should be quoted from the files, not guessed.

**What would you improve next?** Real dataset evaluation for matching, authenticated institutional accounts, image/object storage for larger photos, staff reassignment workflows, a durable scheduled outbox worker and pagination. These are future work; they are not claimed implemented features.

## Demonstration tasks for both members

Each member should demonstrate one SQL feature and one application change they actually made. Explain a failed case, such as duplicate claims or unauthorized review, as well as a successful handover. Finish by showing the real contribution commits and the submitted report.
