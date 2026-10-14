BEGIN;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(80) NOT NULL CHECK(length(trim(name))>=2),
 srn varchar(25) UNIQUE NOT NULL CHECK(srn ~ '^[A-Z0-9_-]{3,25}$'),
 email varchar(160) UNIQUE NOT NULL CHECK(email=lower(email) AND email ~ '^[^ @]+@[^ @]+\.[^ @]+$'),
 password_hash text NOT NULL, role varchar(12) NOT NULL DEFAULT 'student' CHECK(role IN ('student','staff')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (identifier char(64) PRIMARY KEY, failures integer NOT NULL DEFAULT 0, blocked_until timestamptz);
CREATE TABLE IF NOT EXISTS categories (id serial PRIMARY KEY, name varchar(50) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS locations (id serial PRIMARY KEY, name varchar(70) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES users(id),
 kind varchar(5) NOT NULL CHECK(kind IN ('lost','found')),
 title varchar(100) NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 100),
 description varchar(1500) NOT NULL CHECK(length(trim(description))>=10),
 category_id integer NOT NULL REFERENCES categories(id), location_id integer NOT NULL REFERENCES locations(id),
 event_date date NOT NULL CHECK(event_date<=CURRENT_DATE), color varchar(40) NOT NULL DEFAULT '',
 status varchar(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','reserved','returned','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english',title||' '||description||' '||color)) STORED,
 CHECK(kind='found' OR status IN ('open','closed'))
);
CREATE INDEX IF NOT EXISTS items_search_gin ON items USING gin(search_vector);
CREATE INDEX IF NOT EXISTS items_filter_idx ON items(kind,status,category_id,location_id,event_date DESC);
CREATE TABLE IF NOT EXISTS claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid NOT NULL REFERENCES items(id),
 claimant_id uuid NOT NULL REFERENCES users(id), linked_lost_id uuid REFERENCES items(id),
 statement varchar(2000) NOT NULL CHECK(length(trim(statement)) BETWEEN 12 AND 2000),
 status varchar(15) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn','handed_over')),
 reviewer_id uuid REFERENCES users(id), review_note varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 CHECK(item_id IS DISTINCT FROM linked_lost_id),
 CHECK((status IN ('approved','rejected','handed_over') AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
    OR (status IN ('pending','withdrawn') AND reviewer_id IS NULL AND reviewed_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_live_claim_per_user ON claims(item_id,claimant_id) WHERE status IN ('pending','approved','handed_over');
CREATE UNIQUE INDEX IF NOT EXISTS one_owner_per_item ON claims(item_id) WHERE status IN ('approved','handed_over');
CREATE INDEX IF NOT EXISTS claims_queue_idx ON claims(status,created_at);
CREATE TABLE IF NOT EXISTS handovers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), claim_id uuid UNIQUE NOT NULL REFERENCES claims(id),
 item_id uuid UNIQUE NOT NULL REFERENCES items(id), staff_id uuid NOT NULL REFERENCES users(id),
 receipt_note varchar(500) NOT NULL CHECK(length(trim(receipt_note))>=5), completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outbox_events (
 id bigserial PRIMARY KEY, event_type varchar(60) NOT NULL, entity_id uuid NOT NULL,
 payload jsonb, created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(id) WHERE processed_at IS NULL;
-- ALTER is a real, idempotent migration rather than an unused example.
ALTER TABLE items ADD COLUMN IF NOT EXISTS reference_code text;
UPDATE items SET reference_code='LF-'||upper(left(replace(id::text,'-',''),10)) WHERE reference_code IS NULL;
ALTER TABLE items ALTER COLUMN reference_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS items_reference_idx ON items(reference_code);
CREATE OR REPLACE FUNCTION prepare_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at=now();
 IF TG_OP='INSERT' THEN NEW.reference_code='LF-'||upper(left(replace(NEW.id::text,'-',''),10)); END IF;
 IF TG_OP='UPDATE' AND (NEW.kind<>OLD.kind OR NEW.reporter_id<>OLD.reporter_id) THEN RAISE EXCEPTION 'Report kind and reporter cannot change'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS items_prepare ON items;
CREATE TRIGGER items_prepare BEFORE INSERT OR UPDATE ON items FOR EACH ROW EXECUTE FUNCTION prepare_item();
CREATE OR REPLACE FUNCTION guard_claim() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i items; l items;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO i FROM items WHERE id=NEW.item_id FOR UPDATE;
  IF i.id IS NULL OR i.kind<>'found' OR i.status<>'open' THEN RAISE EXCEPTION 'Only open found items accept claims'; END IF;
  IF i.reporter_id=NEW.claimant_id THEN RAISE EXCEPTION 'A finder cannot claim their own report'; END IF;
  IF NEW.status<>'pending' THEN RAISE EXCEPTION 'New claims must be pending'; END IF;
  IF NEW.linked_lost_id IS NOT NULL THEN
   SELECT * INTO l FROM items WHERE id=NEW.linked_lost_id;
   IF l.kind<>'lost' OR l.reporter_id<>NEW.claimant_id OR l.status<>'open' OR l.id IS NULL THEN RAISE EXCEPTION 'Linked lost report must be open and belong to claimant'; END IF;
  END IF;
 END IF;
 IF NEW.reviewer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.reviewer_id AND role='staff') THEN RAISE EXCEPTION 'Reviewer must be staff'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS claims_guard ON claims;
CREATE TRIGGER claims_guard BEFORE INSERT OR UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION guard_claim();
CREATE OR REPLACE FUNCTION emit_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rec jsonb;
BEGIN
 rec=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 -- Ownership proof and credentials never enter the public audit payload.
 INSERT INTO outbox_events(event_type,entity_id,payload) VALUES(
  TG_TABLE_NAME||'.'||lower(TG_OP),(rec->>'id')::uuid,
  jsonb_build_object('status',rec->>'status','kind',rec->>'kind','reference_code',rec->>'reference_code',
   'item_id',COALESCE(rec->>'item_id',rec->>'id'),'actor_id',COALESCE(rec->>'reviewer_id',rec->>'staff_id',rec->>'claimant_id',rec->>'reporter_id')));
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
DROP TRIGGER IF EXISTS items_audit ON items;
CREATE TRIGGER items_audit AFTER INSERT OR UPDATE OR DELETE ON items FOR EACH ROW EXECUTE FUNCTION emit_change();
DROP TRIGGER IF EXISTS claims_audit ON claims;
CREATE TRIGGER claims_audit AFTER INSERT OR UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION emit_change();
DROP TRIGGER IF EXISTS handovers_audit ON handovers;
CREATE TRIGGER handovers_audit AFTER INSERT ON handovers FOR EACH ROW EXECUTE FUNCTION emit_change();
CREATE OR REPLACE FUNCTION review_claim(p_claim uuid,p_staff uuid,p_decision text,p_note text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE c claims; i items; target uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_staff AND role='staff') THEN RAISE EXCEPTION 'Staff role required'; END IF;
 IF p_decision NOT IN ('approved','rejected') OR length(trim(p_note))<5 OR length(p_note)>500 THEN RAISE EXCEPTION 'Decision and review note required'; END IF;
 SELECT item_id INTO target FROM claims WHERE id=p_claim;
 SELECT * INTO i FROM items WHERE id=target FOR UPDATE;
 SELECT * INTO c FROM claims WHERE id=p_claim FOR UPDATE;
 IF c.id IS NULL OR c.status<>'pending' OR i.status<>'open' THEN RAISE EXCEPTION 'Claim is no longer reviewable'; END IF;
 UPDATE claims SET status=p_decision,reviewer_id=p_staff,review_note=p_note,reviewed_at=now() WHERE id=p_claim;
 IF p_decision='approved' THEN
  UPDATE items SET status='reserved' WHERE id=i.id;
  UPDATE claims SET status='rejected',reviewer_id=p_staff,review_note='Another ownership claim was verified',reviewed_at=now() WHERE item_id=i.id AND status='pending';
 END IF;
 RETURN p_claim;
END; $$;
CREATE OR REPLACE FUNCTION confirm_handover(p_claim uuid,p_staff uuid,p_receipt text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE c claims; i items; target uuid; receipt uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_staff AND role='staff') THEN RAISE EXCEPTION 'Staff role required'; END IF;
 SELECT item_id INTO target FROM claims WHERE id=p_claim;
 SELECT * INTO i FROM items WHERE id=target FOR UPDATE;
 SELECT * INTO c FROM claims WHERE id=p_claim FOR UPDATE;
 IF c.id IS NULL OR c.status<>'approved' OR i.status<>'reserved' THEN RAISE EXCEPTION 'Only a verified reserved item can be handed over'; END IF;
 INSERT INTO handovers(claim_id,item_id,staff_id,receipt_note) VALUES(c.id,i.id,p_staff,p_receipt) RETURNING id INTO receipt;
 UPDATE claims SET status='handed_over' WHERE id=c.id;
 UPDATE items SET status='returned' WHERE id=i.id;
 IF c.linked_lost_id IS NOT NULL THEN UPDATE items SET status='closed' WHERE id=c.linked_lost_id AND kind='lost' AND reporter_id=c.claimant_id AND status='open'; END IF;
 RETURN receipt;
END; $$;
CREATE OR REPLACE FUNCTION match_candidates(p_lost uuid) RETURNS TABLE(item_id uuid,score numeric,reasons text) LANGUAGE sql STABLE AS $$
 WITH source AS (SELECT * FROM items WHERE id=p_lost AND kind='lost' AND status='open'), scored AS (
  SELECT f.id,
   (CASE WHEN f.category_id=l.category_id THEN 35 ELSE 0 END + CASE WHEN f.location_id=l.location_id THEN 20 ELSE 0 END +
    CASE WHEN lower(f.color)=lower(l.color) AND l.color<>'' THEN 15 ELSE 0 END +
    greatest(0,15-least(abs(f.event_date-l.event_date),15)) +
    least(15,ts_rank_cd(f.search_vector,plainto_tsquery('english',l.title||' '||l.description))::numeric*100))::numeric score,
   concat_ws(', ',CASE WHEN f.category_id=l.category_id THEN 'same category' END,CASE WHEN f.location_id=l.location_id THEN 'same location' END,
    CASE WHEN lower(f.color)=lower(l.color) AND l.color<>'' THEN 'same color' END,'date gap: '||abs(f.event_date-l.event_date)||' days') reasons
  FROM items f CROSS JOIN source l WHERE f.kind='found' AND f.status='open' AND f.reporter_id<>l.reporter_id
 ) SELECT id,round(score,1),reasons FROM scored WHERE score>=35 ORDER BY score DESC,id LIMIT 12;
$$;
CREATE OR REPLACE VIEW item_directory AS
 SELECT i.id,i.reference_code,i.reporter_id,i.kind,i.title,i.description,i.color,i.status,i.event_date,i.created_at,
 i.category_id,c.name category,i.location_id,l.name location FROM items i JOIN categories c ON c.id=i.category_id JOIN locations l ON l.id=i.location_id;
CREATE OR REPLACE VIEW category_summary AS
 SELECT c.name category,count(i.id) total,count(i.id) FILTER(WHERE i.kind='lost' AND i.status='open') open_lost,
 count(i.id) FILTER(WHERE i.kind='found' AND i.status='open') open_found,count(i.id) FILTER(WHERE i.status='returned') returned
 FROM categories c LEFT JOIN items i ON i.category_id=c.id GROUP BY c.id,c.name;
COMMIT;
-- Additional integrity rules are deferred until COMMIT so multi-row workflows remain atomic.
CREATE OR REPLACE FUNCTION check_item_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key uuid; i items;
BEGIN
 key=(COALESCE(to_jsonb(NEW),to_jsonb(OLD))->>(CASE WHEN TG_TABLE_NAME='items' THEN 'id' ELSE 'item_id' END))::uuid;
 SELECT * INTO i FROM items WHERE id=key;
 IF i.id IS NULL THEN RETURN NULL; END IF;
 IF i.status='reserved' AND NOT EXISTS(SELECT 1 FROM claims WHERE item_id=key AND status='approved') THEN RAISE EXCEPTION 'Reserved item requires an approved claim'; END IF;
 IF i.status='returned' AND NOT EXISTS(SELECT 1 FROM handovers h JOIN claims c ON c.id=h.claim_id WHERE h.item_id=key AND c.status='handed_over') THEN RAISE EXCEPTION 'Returned item requires a completed handover'; END IF;
 IF EXISTS(SELECT 1 FROM claims WHERE item_id=key AND ((status='approved' AND i.status<>'reserved') OR (status='handed_over' AND i.status<>'returned'))) THEN RAISE EXCEPTION 'Claim and item state must agree'; END IF;
 RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS items_consistent ON items;
CREATE CONSTRAINT TRIGGER items_consistent AFTER INSERT OR UPDATE ON items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_item_consistency();
DROP TRIGGER IF EXISTS claims_consistent ON claims;
CREATE CONSTRAINT TRIGGER claims_consistent AFTER INSERT OR UPDATE ON claims DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_item_consistency();
CREATE OR REPLACE FUNCTION guard_handover() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.staff_id AND role='staff') THEN RAISE EXCEPTION 'Handover requires staff'; END IF;
 IF NOT EXISTS(SELECT 1 FROM claims c JOIN items i ON i.id=c.item_id WHERE c.id=NEW.claim_id AND c.item_id=NEW.item_id AND c.status='approved' AND i.status='reserved') THEN RAISE EXCEPTION 'Handover must reference the verified item and claim'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS handovers_guard ON handovers;
CREATE TRIGGER handovers_guard BEFORE INSERT ON handovers FOR EACH ROW EXECUTE FUNCTION guard_handover();
