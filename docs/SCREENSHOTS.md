# Application screenshots for the final report

Browser execution was not available in the project preparation environment. No image in this package is presented as a screenshot of an untested app. The production build and backend HTTP checks are separate evidence.

Start the actual app using the README. Capture your own running browser (Cmd+Shift+4 on macOS, or the screenshot tool on your OS). Do not capture browser passwords or `.env` values.

Save PNG screenshots with these names under `evidence/screenshots/`:

| Name | What to show |
|---|---|
| `01-login.png` | Sign-in page without a visible password |
| `02-student-dashboard.png` | Student overview with seeded database counts |
| `03-search.png` | Browse reports filtered/searched for `blue bottle` |
| `04-matches.png` | Suggested matches from an open lost report |
| `05-private-claim.png` | A synthetic ownership claim in My claims |
| `06-staff-verification.png` | Staff review of synthetic evidence |
| `07-handover.png` | Returned item and handed_over claim after verified handover |
| `08-audit.png` | Staff activity log and grouped event counts |

Use only the synthetic seed data for screenshots of private claim/identifying details. Preserve screenshots from the actual workflow. The team names are recorded in `docs/team.json`. Regenerate the report after adding screenshots if Python 3 and ReportLab are installed:

```bash
python3 -m pip install reportlab
python3 scripts/generate_report.py
```

The regenerated report automatically includes captured files. Review the PDF before submission. The bundled PDF clearly identifies screenshot capture and native concurrency testing as remaining local verification.
