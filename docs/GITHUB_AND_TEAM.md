# Public GitHub submission and genuine team contributions

Public repository: https://github.com/atul-suresh/campus-lost-found-dbms

Team: Atul Suresh (PES1UG24CS098) and Aryan Musale (PES1UG24CS085). The source and report are prepared. Local UI/native concurrency evidence, section-wide title approval and the final individual contribution record remain to be completed by the team.

## Initial upload from your Mac

The connected ChatGPT GitHub integration returned 403 (Resource not accessible by integration) for the source upload. The repository exists; it initially contains only the starter README. From the extracted project folder, run:

```bash
bash scripts/publish-github.sh
```

The script installs GitHub CLI through Homebrew when needed, authenticates in your browser, verifies the account is atul-suresh, clones the repository into a separate temporary working folder, copies the project while excluding local configuration/dependencies, commits the initial import and pushes normally. It stops if the repository already contains other files, and never force-pushes or creates an Aryan contribution history.

## Continue after the initial upload

```bash
git clone https://github.com/atul-suresh/campus-lost-found-dbms.git
cd campus-lost-found-dbms
cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:setup
npm run dev
```

For an existing checkout, pull the latest version before making your next change:

```bash
git pull --ff-only
```

After making and testing a meaningful change, commit with your own Git identity:

```bash
git status
git add <the-files-you-changed>
git commit -m "Describe your actual database or application change"
git push
```

Invite Aryan as a collaborator using his verified GitHub username. Have him clone the repository and contribute under his own Git identity. The initial project import is coding-assisted preparation, not evidence that both students personally implemented every feature. Do not manufacture authors or a contribution history.

Submit the report and the public repository link. Update the report with actual screenshots and completed verification before claiming those steps are done.

## Proposed division: both database and application work

| Member | Database responsibility | Application responsibility | Meaningful follow-up to own and commit |
|---|---|---|---|
| Atul Suresh, PES1UG24CS098 | SQL schema, constraints, indexed text search, matching and transactional verification | Report/search/matches and verification-desk flows | Review matching rules with sample cases, make a justified ranking improvement and add its test |
| Aryan Musale, PES1UG24CS085 | MongoDB validators/indexes, audit aggregation, projection recovery and data dictionary | Authentication, item detail/photo forms and staff audit interface | Add a category-specific descriptor field end to end and add validation/visibility checks |

This is a **proposed work plan**, not completed contribution evidence. Agree the split with your teammate, complete the tasks and update this record with real commit hashes and explanations.

## Contribution record to complete after actual work

Record member name/SRN, changed files, database/application feature, verified result and commit hash. Both members should be able to explain transactions, the two database choices, and role checks; individual viva answers must reflect understanding of the implementation.

A course originality rule applies: use this custom implementation as coding assistance, review it, adapt it to your team and follow your instructor's AI-use policy. Do not present a fabricated individual work log.
