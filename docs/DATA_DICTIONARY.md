# Data dictionary

Generated from the executed PostgreSQL information_schema, with implementation descriptions.

## categories

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | integer | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| name | character varying | NO | Display or lookup name; lookup names are unique. |

## claims

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | uuid | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| item_id | uuid | NO | Foreign key to the found report; unique in handovers. |
| claimant_id | uuid | NO | Foreign key to users; claimant cannot be the finder. |
| linked_lost_id | uuid | YES | Nullable foreign key to claimant-owned open lost report. |
| statement | character varying | NO | Private ownership evidence; trimmed length 12-2000. |
| status | character varying | NO | Workflow state restricted by CHECK and integrity triggers. |
| reviewer_id | uuid | YES | Nullable staff user foreign key; required for reviewed claims. |
| review_note | character varying | NO | Staff reason; bounded 500 characters. |
| created_at | timestamp with time zone | NO | Creation timestamp with timezone; default now(). |
| reviewed_at | timestamp with time zone | YES | Nullable review timestamp; status consistency checked. |

## handovers

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | uuid | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| claim_id | uuid | NO | Unique claim foreign key; one handover per claim. |
| item_id | uuid | NO | Foreign key to the found report; unique in handovers. |
| staff_id | uuid | NO | Foreign key to users; handover trigger requires staff. |
| receipt_note | character varying | NO | Receipt description; minimum trimmed length 5; max 500. |
| completed_at | timestamp with time zone | NO | Completion timestamp; default now(). |

## items

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | uuid | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| reporter_id | uuid | NO | Foreign key to users; immutable report owner. |
| kind | character varying | NO | lost or found; cannot change after creation. |
| title | character varying | NO | Public title; trimmed length 3-100. |
| description | character varying | NO | Public description; minimum trimmed length 10; max 1500. |
| category_id | integer | NO | Foreign key to categories. |
| location_id | integer | NO | Foreign key to locations. |
| event_date | date | NO | Date lost/found; must not exceed current_date. |
| color | character varying | NO | Optional public color string; default empty. |
| status | character varying | NO | Workflow state restricted by CHECK and integrity triggers. |
| created_at | timestamp with time zone | NO | Creation timestamp with timezone; default now(). |
| updated_at | timestamp with time zone | NO | Maintained by the prepare_item trigger. |
| search_vector | tsvector | YES | Generated English tsvector; GIN indexed. |
| reference_code | text | NO | Unique display reference generated at insert. |

## locations

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | integer | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| name | character varying | NO | Display or lookup name; lookup names are unique. |

## login_attempts

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| identifier | character | NO | Primary key hash of normalized login email. |
| failures | integer | NO | Failed-login counter for temporary throttling. |
| blocked_until | timestamp with time zone | YES | Nullable temporary login-block expiry. |

## outbox_events

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | bigint | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| event_type | character varying | NO | Entity.operation or profile.upsert integration event. |
| entity_id | uuid | NO | UUID logical entity reference; no polymorphic FK. |
| payload | jsonb | YES | Pending JSONB event payload; cleared after delivery. |
| created_at | timestamp with time zone | NO | Creation timestamp with timezone; default now(). |
| processed_at | timestamp with time zone | YES | Null while queued; delivery timestamp after successful projection. |

## sessions

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| token_hash | character | NO | Primary key containing SHA-256 of a random session token. |
| user_id | uuid | NO | Foreign key to users; session removed when user is removed. |
| expires_at | timestamp with time zone | NO | Backend-enforced session expiry timestamp. |
| created_at | timestamp with time zone | NO | Creation timestamp with timezone; default now(). |

## users

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| id | uuid | NO | Surrogate primary key; UUID for domain records, serial/bigserial for lookup/event records. |
| name | character varying | NO | Display or lookup name; lookup names are unique. |
| srn | character varying | NO | Unique institutional identifier; permitted uppercase characters enforced. |
| email | character varying | NO | Unique lowercase email with database format check. |
| password_hash | text | NO | Salted scrypt hash; no plaintext password stored. |
| role | character varying | NO | student or staff; registration always inserts student. |
| created_at | timestamp with time zone | NO | Creation timestamp with timezone; default now(). |
