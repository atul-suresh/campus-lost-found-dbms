"""Generate the course report from the actual implementation/evidence.
Run from any directory; optional real browser screenshots are included when supplied.
Requires reportlab. The output is docs/Campus_Lost_Found_Report.pdf.
"""
from pathlib import Path
import json,re,html
from collections import defaultdict
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Image,Preformatted,KeepTogether
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
team=json.loads((DOCS/'team.json').read_text())
verification=json.loads((ROOT/'evidence/verification.json').read_text())
http=json.loads((ROOT/'evidence/http_results.json').read_text())
tap=(ROOT/'evidence/test_results.tap').read_text()
INK=colors.HexColor('#183d34');GREEN=colors.HexColor('#216b54');MUTED=colors.HexColor('#718376');PALE=colors.HexColor('#eff4e7');LINE=colors.HexColor('#d9e3d2')
W,H=A4;CW=W-104
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body',fontName='Helvetica',fontSize=9.3,leading=14,textColor=INK,spaceAfter=10))
styles.add(ParagraphStyle(name='Section',fontName='Helvetica-Bold',fontSize=24,leading=29,textColor=INK,spaceAfter=18))
styles.add(ParagraphStyle(name='Sub',fontName='Helvetica-Bold',fontSize=12,leading=16,textColor=GREEN,spaceBefore=10,spaceAfter=9))
styles.add(ParagraphStyle(name='Tiny',fontName='Helvetica',fontSize=8,leading=11,textColor=MUTED,spaceAfter=9))
styles.add(ParagraphStyle(name='Cell',fontName='Helvetica',fontSize=8,leading=11,textColor=INK))
styles.add(ParagraphStyle(name='CellSmall',fontName='Helvetica',fontSize=7.3,leading=10,textColor=INK))
styles.add(ParagraphStyle(name='White',fontName='Helvetica-Bold',fontSize=8,leading=11,textColor=colors.white))
styles.add(ParagraphStyle(name='CodeBlock',fontName='Courier',fontSize=7.2,leading=10,textColor=INK,backColor=PALE,borderPadding=10,spaceAfter=12))
styles.add(ParagraphStyle(name='CoverTitle',fontName='Helvetica-Bold',fontSize=38,leading=43,textColor=INK,spaceAfter=22))
# Embed a real TrueType family when available for stable PDF rendering.
fontsets=[
 (Path('/usr/share/fonts/truetype/liberation2'),['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf','LiberationMono-Regular.ttf']),
 (Path('/usr/share/fonts/truetype/liberation'),['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf','LiberationMono-Regular.ttf']),
 (Path('/usr/share/fonts/truetype/dejavu'),['DejaVuSans.ttf','DejaVuSans-Bold.ttf','DejaVuSansMono.ttf'])
]
for fontdir,filenames in fontsets:
 if all((fontdir/f).exists() for f in filenames):
  for name,filename in zip(['CampusSans','CampusSansBold','CampusMono'],filenames):
   pdfmetrics.registerFont(TTFont(name,str(fontdir/filename)))
  pdfmetrics.registerFontFamily('CampusSans',normal='CampusSans',bold='CampusSansBold',italic='CampusSans',boldItalic='CampusSansBold')
  for style in styles.byName.values():
   if not hasattr(style,'fontName'):continue
   style.fontName={'Helvetica':'CampusSans','Helvetica-Bold':'CampusSansBold','Courier':'CampusMono'}.get(style.fontName,style.fontName)
  break
story=[]
def p(s,style='Body'):story.append(Paragraph(s,styles[style]))
def sub(s):p(s,'Sub')
def section(n,title):story.extend([PageBreak(),Paragraph(f'{n:02d} / {title}',styles['Section'])])
def code(s):story.append(Preformatted(s.strip(),styles['CodeBlock']))
def table(headers,rows,widths=None,small=False):
 st='CellSmall' if small else 'Cell'
 data=[[Paragraph(html.escape(str(x)),styles['White']) for x in headers]]+[[Paragraph(html.escape(str(x)),styles[st]) for x in row] for row in rows]
 t=Table(data,colWidths=widths or [CW/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),5 if small else 8),('BOTTOMPADDING',(0,0),(-1,-1),5 if small else 8),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('LINEBELOW',(0,1),(-1,-1),.3,LINE)]))
 story.extend([t,Spacer(1,12)])
def img(path,maxw=CW,maxh=450):
 im=Image(str(path));scale=min(maxw/im.imageWidth,maxh/im.imageHeight);im.drawWidth=im.imageWidth*scale;im.drawHeight=im.imageHeight*scale;im.hAlign='CENTER';story.extend([im,Spacer(1,14)])
def footer(c,doc):
 if doc.page==1:return
 c.saveState();c.setStrokeColor(LINE);c.line(52,43,W-52,43);c.setFillColor(MUTED);c.setFont('CampusSans' if 'CampusSans' in pdfmetrics.getRegisteredFontNames() else 'Helvetica',7);c.drawString(52,29,'PES UNIVERSITY  |  DBMS EXPERIENTIAL LEARNING - LEVEL 3');c.drawRightString(W-52,29,f'{doc.page:02d}');c.restoreState()

p('PES UNIVERSITY<br/>DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING','Tiny')
story.append(Spacer(1,75))
p('Campus Lost<br/>&amp; Found<br/>Management System','CoverTitle')
p('Verified ownership. Explainable matching.<br/>Transactional handover and recoverable document history.','Sub')
story.append(Spacer(1,25))
table(['PROJECT','DETAIL'],[
 ('Course','DBMS Experiential Learning - Level 3'),('Member 1',f"{team['member1_name']} | {team['member1_srn']}"),('Member 2',f"{team['member2_name']} | {team['member2_srn']}"),('Technology','Next.js + PostgreSQL + MongoDB'),('Updated','14 October 2026'),('Repository',team.get('github_url') or 'Publication pending - instructions included in source package')],[115,CW-115])
p('Implementation and test-evidence package','Sub')
p('The implementation, schema, sample data, report and demonstration guide are prepared. Actual browser screenshots, native PostgreSQL concurrency verification, and genuine individual contribution evidence remain to be completed by the team. The public repository link is recorded above; confirm the project files are uploaded before submission.','Tiny')
p('All sample accounts, reports, ownership statements and handovers are demonstration data. This report does not claim real university incident data or completed individual contributions.','Tiny')

section(1,'Problem, objectives and scope')
p('Lost belongings are often reported through disconnected group chats or informal helpdesk notes. Students may miss relevant reports, and public messages can disclose the very identifying detail needed to verify an owner. A simple list of items does not provide a trustworthy return process.')
p('The proposed system connects lost/found discovery with private ownership evidence, staff review and a recorded handover. It provides a searchable campus directory and ranked suggestions while keeping the final ownership decision with staff.')
sub('Objectives')
for s in ['Centralize lost/found reporting, categorization and location-based discovery.','Suggest plausible matches using explainable text and metadata ranking.','Protect identifying clues and claim evidence from unrelated students.','Prevent duplicate active claims and multiple verified owners for one found item.','Return an item and close its linked lost report in one SQL transaction.','Provide audit analytics and retry document updates after temporary database failure.']:p('- '+s)
sub('Functional responsibilities')
table(['ROLE','CAPABILITIES'],[('Student','Register/sign in; create, edit or delete eligible reports; search; view own matches; submit or withdraw own pending claims; close own lost report.'),('Staff','View private identifying details and claims; approve/reject evidence; complete in-person handovers; inspect audit aggregation; retry synchronization.')],[85,CW-85])
sub('Data and boundaries')
p('The reproducible seed contains 24 synthetic reports, 4 demo accounts, 7 item categories and 6 campus locations. Three sample claims demonstrate pending, approved and handed-over states. No real dataset was supplied. The system does not implement image recognition, email/SMS notifications or automatic ownership verification.')

section(2,'System architecture')
img(DOCS/'architecture.png',maxw=410,maxh=425)
p('The Next.js page calls backend route handlers. Every protected handler authenticates a server session; services check the role and report ownership. Parameterized PostgreSQL queries operate on normalized workflow records. MongoDB serves item profiles and staff audit documents.')
p('SQL changes and outbox events commit together. A dispatcher writes the event to MongoDB and marks it delivered only after success. Cross-database consistency is eventual; no distributed ACID transaction is claimed. Supplemental details can be pending while the report itself is safely committed.')
p('Configuration is supplied through environment variables. The deliverable uses native PostgreSQL and MongoDB through Docker; the preparation evidence used the PostgreSQL engine via PGlite and a native MongoDB 8.0.15 process.','Tiny')

section(3,'Entity-relationship design')
img(DOCS/'er.png',maxw=CW,maxh=525)
p('PK = primary key; FK = foreign key; UK = unique key. Each user can report many items and make many claims. Claims reference a found report and optionally a claimant-owned lost report. A verified claim and found item each have at most one handover receipt. Reviewer and handover staff reference the same user table.')
p('The operational diagram shows seven related tables. Two additional infrastructure tables are login_attempts and outbox_events. The outbox entity_id is a polymorphic logical identifier, not an SQL foreign key. Exact column types and constraints are defined in db/schema.sql.','Tiny')

section(4,'Relational schema and normalization')
code('''USERS(id PK, name, srn UK, email UK, password_hash, role, created_at)
SESSIONS(token_hash PK, user_id FK, expires_at, created_at)
LOGIN_ATTEMPTS(identifier PK, failures, blocked_until)
CATEGORIES(id PK, name UK)
LOCATIONS(id PK, name UK)
ITEMS(id PK, reporter_id FK, kind, title, description, category_id FK,
      location_id FK, event_date, color, status, created_at, updated_at,
      search_vector GENERATED, reference_code UK)
CLAIMS(id PK, item_id FK, claimant_id FK, linked_lost_id FK, statement,
       status, reviewer_id FK, review_note, created_at, reviewed_at)
HANDOVERS(id PK, claim_id FK/UK, item_id FK/UK, staff_id FK,
          receipt_note, completed_at)
OUTBOX_EVENTS(id PK, event_type, entity_id, payload, created_at,
              processed_at)''')
sub('Normalization')
p('Domain attributes are atomic, and each table uses a single-column primary key, so non-key attributes have no partial dependency on a composite primary key. Category and location names are stored once in lookup tables rather than repeated in reports. User identity is stored independently of reports and claims. These relations follow a practical 3NF design: report facts depend on an item, claim facts on a claim and receipt facts on a handover.')
p('The generated search_vector and reference_code are deliberate derived values for retrieval and display. They are not independent sources of truth. MongoDB profiles intentionally keep a document shape for varying item descriptors. The transient outbox payload is integration infrastructure, not a second normalized item-profile table.')
sub('Important integrity rules')
table(['RULE','DATABASE ENFORCEMENT'],[('Valid report facts','Non-null columns, bounded text, kind/status checks, category/location/user foreign keys, nonfuture event_date.'),('One owner','Partial unique index on item_id for approved/handed_over claims.'),('Duplicate active claim','Partial unique index on item_id and claimant_id for active statuses.'),('Correct lost-report link','Trigger checks the linked record is open, lost and belongs to the claimant.'),('Consistent final state','Deferred triggers require approved/reserved and completed-handover/returned state agreement.'),('Verified handover','Stored function and guard trigger require staff, the correct approved claim and reserved item; receipt/item keys are unique.')],[125,CW-125])

notes={
'id':'Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records.',
'name':'Display or lookup name; lookup names are unique.', 'srn':'Unique institutional identifier; permitted uppercase characters enforced.', 'email':'Unique lowercase email with database format check.', 'password_hash':'Salted scrypt hash; no plaintext password stored.', 'role':'student or staff; registration always inserts student.', 'created_at':'Creation timestamp with timezone; default now().', 'token_hash':'Primary key containing SHA-256 of a random session token.', 'user_id':'Foreign key to users; session removed when user is removed.', 'expires_at':'Backend-enforced session expiry timestamp.', 'identifier':'Primary key hash of normalized login email.', 'failures':'Failed-login counter for temporary throttling.', 'blocked_until':'Nullable temporary login-block expiry.', 'reporter_id':'Foreign key to users; immutable report owner.', 'kind':'lost or found; cannot change after creation.', 'title':'Public title; trimmed length 3-100.', 'description':'Public description; minimum trimmed length 10; max 1500.', 'category_id':'Foreign key to categories.', 'location_id':'Foreign key to locations.', 'event_date':'Date lost/found; must not exceed current_date.', 'color':'Optional public color string; default empty.', 'status':'Workflow state restricted by CHECK and integrity triggers.', 'updated_at':'Maintained by the prepare_item trigger.', 'search_vector':'Generated English tsvector; GIN indexed.', 'reference_code':'Unique display reference generated at insert.', 'item_id':'Foreign key to the found report; unique in handovers.', 'claimant_id':'Foreign key to users; claimant cannot be the finder.', 'linked_lost_id':'Nullable foreign key to claimant-owned open lost report.', 'statement':'Private ownership evidence; trimmed length 12-2000.', 'reviewer_id':'Nullable staff user foreign key; required for reviewed claims.', 'review_note':'Staff reason; bounded 500 characters.', 'reviewed_at':'Nullable review timestamp; status consistency checked.', 'claim_id':'Unique claim foreign key; one handover per claim.', 'staff_id':'Foreign key to users; handover trigger requires staff.', 'receipt_note':'Receipt description; minimum trimmed length 5; max 500.', 'completed_at':'Completion timestamp; default now().', 'event_type':'Entity.operation or profile.upsert integration event.', 'entity_id':'UUID logical entity reference; no polymorphic FK.', 'payload':'Pending JSONB event payload; cleared after delivery.', 'processed_at':'Null while queued; delivery timestamp after successful projection.'}
cols=defaultdict(list)
for col in verification.get('columns',[]):cols[col['table_name']].append(col)
def dictionary(tables):
 for name in tables:
  sub(name)
  rows=[(c['column_name'],c['data_type'].replace('timestamp with time zone','timestamptz').replace('character varying','varchar'),'Yes' if c['is_nullable']=='YES' else 'No',notes.get(c['column_name'],'See schema.sql.')) for c in cols[name]]
  table(['COLUMN','TYPE','NULL','DESCRIPTION'],rows,[108,76,44,CW-228],small=True)
section(5,'Data dictionary: identity and lookups')
dictionary(['users','sessions','login_attempts'])
sub('Category and location lookups')
table(['TABLE','COLUMNS','CONSTRAINTS'],[('categories','id: serial; name: varchar(50)','id primary key; name unique and not null.'),('locations','id: serial; name: varchar(70)','id primary key; name unique and not null.')],[80,180,CW-260],small=True)
section(6,'Data dictionary: item reports')
dictionary(['items'])
p('Items contain public, relational facts. Category-dependent attributes, photo data and private identifying details are stored in MongoDB item_profiles and never appear in the public SQL directory view.')
section(7,'Data dictionary: claims and handovers')
dictionary(['claims','handovers'])
section(8,'Outbox and document model')
dictionary(['outbox_events'])
sub('MongoDB collections')
table(['COLLECTION','MODEL AND RETRIEVAL'],[('item_profiles','_id: SQL item UUID string; public: flexible attribute object and optional photo; secret: private identifying detail; event_id: latest projection version. Read by exact _id; brand index for descriptor access.'),('audit_events','_id: unique SQL event sequence number; event_type, entity_id, created_at, details. Staff-only exact/entity history retrieval and grouped action aggregation. Compound entity/time and action/time indexes.')],[100,CW-100])
code('''{
  "_id": "<SQL item UUID>",
  "public": {"brand": "Milton", "material": "Steel", "photo": null},
  "secret": "Initials engraved under the base",
  "event_id": 52
}''')
p('The document above is a schema example, not a screenshot or copied record. Strict JSON Schema requires the profile identity, public object, secret string and numeric event version. The backend additionally limits attribute count/key/value lengths, photo type/size and private text length. Public API reads omit secret unless the caller is the reporter or staff.')
sub('Advanced NoSQL aggregation')
code('''audit_events.aggregate([
  {$match: {event_type: {$ne: "profile.upsert"}}},
  {$group: {_id: "$event_type", count: {$sum: 1},
            latest: {$max: "$created_at"}}},
  {$sort: {count: -1, _id: 1}}
])''')

section(9,'Workflow, privacy and consistency')
table(['OBJECT','ALLOWED WORKFLOW'],[('Found report','open -> reserved after staff approval -> returned after receipt.'),('Lost report','open -> closed by its reporter/staff or linked verified handover.'),('Claim','pending -> approved, rejected or withdrawn; approved -> handed_over.'),('Deletion','Only open reports with no claim references/history may be deleted.')],[100,CW-100])
sub('Approval and handover')
p('review_claim locks the found item first, then the requested claim. It verifies the staff role and current state, updates the selected claim and reserves the item. Competing pending claims are rejected inside the same statement transaction. confirm_handover checks the reserved/approved pair, inserts a unique receipt, marks the item returned and claim handed_over, then closes an eligible linked lost report.')
p('Deferred consistency triggers examine final table state at commit. Temporary intermediate states within these functions are allowed; inconsistent final states are rejected. A test directly attempted to mark a report reserved without an approved claim and confirmed the statement failed.')
sub('Private evidence')
p('Students see public reports, their own identifying detail and their own claim statements. Staff see the evidence needed to verify ownership. The finder does not receive another student\'s private claim statement through the claim-list API. Audit payloads contain safe event summaries and exclude proof text and passwords.')
sub('Recoverable document delivery')
p('A profile event is inserted in the same SQL transaction as its report. The dispatcher uses an advisory transaction lock to serialize workers and locks pending rows. MongoDB audit writes use the SQL event ID as a unique key, and profile writes reject older event versions. After successful writes the SQL delivery timestamp is set and the profile payload is cleared. Failed batches roll back SQL delivery marks, preserving a retryable queue.')
p('An executed failure-recovery test temporarily enforced an incompatible MongoDB validator. The report still committed in SQL with a queued event. Restoring validation and rerunning dispatch created the profile successfully. This proves retry behavior under a rejected document write; it does not simulate every possible distributed failure.')

section(10,'SQL implementation and important queries')
p('The complete executable scripts are db/schema.sql and db/queries.sql. They include CREATE statements, a genuine idempotent ALTER migration for item reference codes, primary/foreign keys, constraints, indexes, views and trigger/function definitions. A disposable table demonstrates DROP without removing application tables.')
sub('JOIN with filtering and ordering')
code("""SELECT reference_code, title, category, location, status
FROM item_directory
WHERE kind='found' AND status='open'
ORDER BY event_date DESC;""")
sub('GROUP BY, HAVING and aggregate')
code("""SELECT l.name, count(*) AS open_reports
FROM items i JOIN locations l ON i.location_id=l.id
WHERE i.status='open'
GROUP BY l.name HAVING count(*) >= 2
ORDER BY open_reports DESC;""")
sub('Subquery for unclaimed open reports')
code("""SELECT reference_code, title FROM items i
WHERE kind='found' AND status='open'
AND NOT EXISTS (
  SELECT 1 FROM claims c
  WHERE c.item_id=i.id AND c.status='pending'
);""")
sub('Full-text retrieval')
code("""SELECT reference_code, title,
  ts_rank(search_vector,
          websearch_to_tsquery('english','blue bottle')) AS rank
FROM items
WHERE search_vector @@ websearch_to_tsquery('english','blue bottle')
ORDER BY rank DESC;""")
p('INSERT, UPDATE and DELETE are exercised by report creation/edit/deletion and the disposable DDL demonstration. Query result files record executed commands and rows. No query-performance speedup is claimed for the small synthetic dataset.','Tiny')

section(11,'Ranking and advanced database features')
sub('Explainable matching')
p('match_candidates accepts an open lost report and retrieves open found reports from another reporter. It scores category, location, nonempty color equality, event-date distance and PostgreSQL text rank. The function returns at most 12 candidates scoring at least 35 points.')
table(['SIGNAL','MAXIMUM','CALCULATION'],[('Category','35','35 if category IDs are equal.'),('Location','20','20 if location IDs are equal.'),('Color','15','15 for equal nonempty colors, case-insensitive.'),('Date proximity','15','max(0, 15 - min(abs(date difference),15)).'),('Description/title text','15','min(15, ts_rank_cd(found search_vector, lost text query) * 100).')],[95,60,CW-155])
p('The score ranges from 0 to 100. It is a heuristic relevance score, not a calibrated probability. Weights have not been optimized on labelled real campus data. The matching output explains metadata agreement and date gaps; staff verification remains mandatory.')
sub('Course advanced-feature coverage')
table(['FEATURE','CONCRETE USE'],[('Transactions / locks','Report + profile-event write; row-locked approval; atomic receipt/return/link closure.'),('Views','item_directory JOIN view and category_summary filtered aggregates.'),('Stored functions','review_claim, confirm_handover and match_candidates.'),('Triggers','prepare_item, guard_claim, audit emission, handover guard and deferred state checks.'),('Indexing / full text','GIN search, composite filters, unique reference and partial claim ownership indexes.'),('NoSQL aggregation','Staff grouped audit action counts and latest activity timestamps.')],[122,CW-122])

section(12,'Backend integration and authentication')
p('The Next.js catch-all route handler exposes a JSON API and delegates database operations to service functions. Credentials are read from environment variables. SQL parameters are bound rather than interpolated. Inputs are checked in the backend and the databases; hiding a button is never treated as authorization.')
table(['METHOD / PATH','AUTHORIZED BEHAVIOR'],[('POST auth/register','Create a student only, regardless of submitted role.'),('POST auth/login; POST auth/logout','Verify password; set session cookie; revoke session.'),('GET auth/me; GET lookups','Read authenticated user and category/location options.'),('GET/POST items','Authenticated directory; create a report owned by caller.'),('GET/PUT/DELETE items/:id','Role-aware detail; reporter/staff edit/delete eligible report.'),('GET items/:id/matches','Reporter/staff access to open lost-report candidates.'),('POST items/:id/close','Reporter/staff closes eligible lost report.'),('GET/POST claims','Own claims for students, all for staff; submit private evidence.'),('POST claims/:id/withdraw','Claimant-only pending withdrawal.'),('POST claims/:id/review; handover','Staff-only database verification and receipt workflows.'),('GET dashboard; GET audit','SQL overview; staff-only audit documents/aggregation.'),('POST sync; GET diagnostics','Staff-only delivery retry and database diagnostics.')],[180,CW-180],small=True)
p('Passwords use salted scrypt hashes. A random session token is stored in an HttpOnly, SameSite cookie; SQL stores its SHA-256 hash and a 12-hour expiry. Login attempts are temporarily blocked after repeated failures. Mutation requests require an allowed Origin. For HTTPS hosting, COOKIE_SECURE must be true. Local compose services bind to loopback and the provided settings are for a laptop demonstration.')

section(13,'Application interface and screenshot evidence')
p('The implemented interface contains student and staff navigation, sign-in/registration, overview counts, a noticeboard with filters, report forms with optional photos, report details, ranked matches, private claim forms, a staff verification desk and an audit dashboard. The layout contains responsive rules for smaller screens and labelled input controls.')
p('<b>Verification limit:</b> Browser interaction and screenshot capture were not performed in this environment. A production build and HTTP responses validate application compilation and backend integration; they do not prove every visual interaction. No UI illustration is passed off as an actual screenshot.')
screens=[('01-login.png','Sign-in page with password hidden'),('02-student-dashboard.png','SQL-backed student overview'),('03-search.png','Filtered blue bottle search'),('04-matches.png','Ranked candidates for open lost report'),('05-private-claim.png','Synthetic claimant evidence'),('06-staff-verification.png','Staff verification of identifying detail'),('07-handover.png','Returned/handed_over states'),('08-audit.png','Document audit history and grouped counts')]
table(['SCREENSHOT FILE','CAPTURE TO COMPLETE'],screens,[185,CW-185])
p('Run the app locally using the README and capture these screens under evidence/screenshots/. Use only synthetic evidence for private-detail captures. The included generator inserts captured images into a screenshot appendix when rerun. Instructions are in docs/SCREENSHOTS.md.')

section(14,'Actual tests and results')
counts={k:int(re.search(r'^# '+k+r' (\d+)$',tap,re.M).group(1)) for k in ['tests','pass','fail','skipped']}
table(['CHECK','RECORDED RESULT'],[('Next.js production build','Passed: page and API route compiled successfully.'),('Database/service suite',f"{counts['pass']} passed; {counts['fail']} failed; {counts['skipped']} skipped, out of {counts['tests']} tests."),('Backend HTTP suite',f"{len(http['results'])} checks passed against production Next.js server."),('Dependency audit','0 known vulnerabilities reported by npm audit at preparation time.'),('PostgreSQL engine',verification['postgresql_version'].split(',')[0]),('MongoDB process',verification['mongodb_version']),('Outbox after checks',str(verification['pending_events'])+' pending events.'),('Unexecuted checks','Native PostgreSQL simultaneous approval; browser UI interaction/screenshots.')],[160,CW-160])
sub('Database cases exercised')
p('Executed cases covered setup idempotence, valid/invalid authentication, expiry/throttling, insert/update/delete, private-field visibility, search/filtering, bad dates, foreign keys, matching, own-report restrictions, duplicate active claims, correct lost links, claimant-only evidence, staff authorization, competing-claim rejection, handover and link closure, premature/duplicate handover, withdrawal, retained claim history, rollback, deferred consistency, MongoDB validation, idempotent event replay, delivery failure/recovery, aggregation/views and DDL/query examples.')
p('The simultaneous-approval test is included but skipped when SQL_ENGINE=pglite. Its skip is intentional because PGlite is a single-connection PostgreSQL build; the normal Docker setup runs native PostgreSQL and can execute that test. Native concurrency results must be collected on the team\'s machine before claiming that scenario is demonstrated.')
sub('Recorded HTTP cases')
p('The '+str(len(http['results']))+' production HTTP checks exercised anonymous rejection, Origin enforcement, protected session cookies, dashboard/directory retrieval, staff-only routes, invalid input, parameterized search, student-only registration, logout, audit/diagnostics and synchronization. The full lifecycle created a found report and linked lost report, hid the private clue from a student, submitted ownership evidence, denied student review, then approved and handed over as staff. Both final report states were checked.')
p('Raw outputs: evidence/test_results.tap, http_results.json, query_results.jsonl, build.txt and verification.json. The verification database includes additional isolated test records beyond the 24-report seed. Test data counts are not presented as real campus activity.','Tiny')

section(15,'Setup, demonstration and team work')
sub('Local execution')
code('''cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:setup
npm run dev''')
p('Open http://localhost:3000. The example demo password is CampusDemo@2026 and may be changed in .env before seeding. Demo emails are atul@campus.test, student085@campus.test, student@campus.test and staff@campus.test. The actual seed generates hashes from DEMO_PASSWORD; no production credential is embedded in application code.')
sub('Demonstration sequence')
p('Show an open lost report and matching found candidates. Submit a new claim with a private identifying detail and a linked lost report. Sign in as staff, compare evidence, approve with a reason, and complete handover with a receipt. Show returned/handed_over and closed linked-report states. Explain SQL constraints/functions, display the audit aggregation, and run npm run demo:queries.')
sub('Proposed responsibilities, to complete honestly')
table(['MEMBER','DATABASE + APPLICATION WORK'],[(team['member1_name']+' ('+team['member1_srn']+')','SQL schema/constraints, matching/verification; report/search/matches and staff workflow. Own a justified ranking improvement and its test.'),(team['member2_name']+' ('+team['member2_srn']+')','MongoDB validation/aggregation/retry; authentication, profile/photo forms and audit view. Own a category-specific descriptor enhancement and its checks.')],[110,CW-110])
p('This is a proposed split, not completed contribution evidence. Each member must make meaningful modifications, test them and commit using their own identity. The package does not fabricate student authors or commit history.')
section(16,'Conclusion and submission status')
p('The custom implementation connects relational integrity, document flexibility, explainable discovery and verified recovery. It goes beyond report CRUD through private claims, atomic handovers, final-state enforcement and retryable audit delivery. Automated evidence supports the implemented database and API behavior under the stated test environment.')
p('Before final submission: confirm section title uniqueness, capture the actual UI screens, run native PostgreSQL/concurrency checks, record each member\'s real contributions, confirm the initial project upload, and keep the public GitHub repository updated. The report and repository link are the instructor\'s requested deliverables.')
sub('References')
refs=[('Course source','Supplied DBMS Level 3 Project Requirements.pdf, pp. 1-5; supplied instructor email image.'),('Next.js','https://nextjs.org/docs/app/api-reference/functions/cookies'),('Next.js authentication','https://nextjs.org/docs/app/guides/authentication'),('PostgreSQL trigger definitions','https://www.postgresql.org/docs/current/sql-createtrigger.html'),('PostgreSQL text search','https://www.postgresql.org/docs/current/textsearch.html'),('MongoDB validation','https://www.mongodb.com/docs/manual/core/schema-validation/'),('MongoDB aggregation','https://www.mongodb.com/docs/manual/core/aggregation-pipeline/')]
for label,url in refs:p('<b>'+html.escape(label)+':</b> '+html.escape(url),'Tiny')

captured=[(name,label,DOCS.parent/'evidence/screenshots'/name) for name,label in screens if (DOCS.parent/'evidence/screenshots'/name).exists()]
if captured:
 section(17,'Captured application screenshots')
 for index,(name,label,path) in enumerate(captured):
  if index:story.append(PageBreak())
  sub(label);img(path,maxw=CW,maxh=600);p('Actual locally captured browser screenshot: '+html.escape(name),'Tiny')
output=DOCS/'Campus_Lost_Found_Report.pdf'
doc=SimpleDocTemplate(str(output),pagesize=A4,rightMargin=52,leftMargin=52,topMargin=54,bottomMargin=57,title=team['project_title'],author=f"{team['member1_name']} / {team['member2_name']}")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
# Generate an editable exact schema dictionary alongside the PDF.
md=['# Data dictionary','', 'Generated from the executed PostgreSQL information_schema, with implementation descriptions.','']
for name in sorted(cols):
 md += ['## '+name,'','| Column | Type | Nullable | Meaning |','|---|---|---|---|']
 for c in cols[name]:md.append('| '+ ' | '.join([c['column_name'],c['data_type'],c['is_nullable'],notes.get(c['column_name'],'See schema.sql.')])+' |')
 md.append('')
(DOCS/'DATA_DICTIONARY.md').write_text('\n'.join(md))
print(output)
