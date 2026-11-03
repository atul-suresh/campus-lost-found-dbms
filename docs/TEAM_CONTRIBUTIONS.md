# Team contribution and review record

Project: Campus Lost & Found Management System.

| Member | Database component ownership | Application component ownership |
|---|---|---|
| Atul Suresh, PES1UG24CS098 | SQL design, constraints, same-category matching, normalized color ranking, row-locked approval and transactional handover | Report/search/matches, verification desk and demonstration of the recovery workflow |
| Aryan Musale, PES1UG24CS085 | MongoDB profile validation, descriptor fields, indexes, audit aggregation and outbox recovery | Profile/descriptor editing, authentication/session behavior, audit and mobile views |

## Completed assisted implementation

The final changes and automated verification were prepared with coding assistance on 29 October 2026. They include same-category matching, normalized color handling, category-specific public descriptors, preservation of flexible fields on edit, validation of reserved names, stronger MongoDB descriptor validation, logout state cleanup, timezone-stable date formatting, a Next.js security patch update, launch/verification scripts, and the final report/presentation/evidence.

Recorded results: 35 native database tests, three unit checks, 20 HTTP checks and 17 browser checks passed. Student ownership above organizes explanation and follow-up work; it is not a claim that either student personally typed all assisted changes.

## Individual confirmation

On 3 November 2026, Atul confirmed that both Atul and Aryan ran the application and checked it. This is a user-reported confirmation; the date of those runs and the specific checks were not supplied.

| Member | Confirmed activity | Confirmation date | Further preparation |
|---|---|---|---|
| Atul Suresh | Ran the application and checked it, as reported by Atul | 3 November 2026 | Detailed code review and demo rehearsal not separately confirmed |
| Aryan Musale | Ran the application and checked it, as reported by Atul | 3 November 2026 | Detailed code review and demo rehearsal not separately confirmed |

The component ownership table provides a preparation structure rather than evidence of personally authored code. Record any additional review, rehearsal or personally authored change with its actual date and commit hash. Assisted synchronization and automated testing are documented as assisted work; no teammate authorship is manufactured.

## Final repository verification

On 3 November 2026, coding-assisted synchronization published the final package and reran all four suites on standard upstream PostgreSQL 17.6 and MongoDB 8.0.15 services. All 75 checks passed without failures or skips. The run and tested commit are recorded in `evidence/ci_run.json`. This automated verification is separate from the student-reported app checks above.
