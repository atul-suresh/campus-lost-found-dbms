-- Q1: JOIN, filtering and ORDER BY: the public directory
SELECT reference_code,title,category,location,status FROM item_directory WHERE kind='found' AND status='open' ORDER BY event_date DESC;
-- Q2: aggregate, GROUP BY and HAVING: busy locations
SELECT l.name,count(*) AS open_reports FROM items i JOIN locations l ON i.location_id=l.id WHERE i.status='open' GROUP BY l.name HAVING count(*)>=2 ORDER BY open_reports DESC;
-- Q3: subquery: open found reports without pending claims
SELECT reference_code,title FROM items i WHERE kind='found' AND status='open' AND NOT EXISTS(SELECT 1 FROM claims c WHERE c.item_id=i.id AND c.status='pending');
-- Q4: SQL view with filtered aggregates
SELECT * FROM category_summary ORDER BY total DESC;
-- Q5: GIN-backed full-text search (planner may prefer sequential scan on this tiny dataset)
SELECT reference_code,title,ts_rank(search_vector,websearch_to_tsquery('english','blue bottle')) rank FROM items WHERE search_vector @@ websearch_to_tsquery('english','blue bottle') ORDER BY rank DESC;
-- Q6: user-specific row visibility through JOIN
SELECT c.id,i.title,c.status FROM claims c JOIN items i ON i.id=c.item_id JOIN users u ON u.id=c.claimant_id WHERE u.email='atul@campus.test';
-- Q7: stored matching function, date and category ranking
SELECT * FROM match_candidates((SELECT id FROM items WHERE reference_code=(SELECT reference_code FROM items WHERE kind='lost' AND title='Blue steel water bottle' LIMIT 1)));
-- Q8: outbox recovery queue
SELECT id,event_type,created_at FROM outbox_events WHERE processed_at IS NULL ORDER BY id;
-- DDL safety: a disposable object proves CREATE / ALTER / DROP without dropping application tables.
BEGIN;
CREATE TEMP TABLE ddl_demo(id integer PRIMARY KEY,label text NOT NULL);
ALTER TABLE ddl_demo ADD COLUMN created_at timestamptz DEFAULT now();
INSERT INTO ddl_demo(id,label) VALUES(1,'DBMS demonstration');
UPDATE ddl_demo SET label='Updated demonstration' WHERE id=1;
SELECT * FROM ddl_demo;
DELETE FROM ddl_demo WHERE id=1;
DROP TABLE ddl_demo;
COMMIT;
