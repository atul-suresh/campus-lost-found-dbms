import {writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {sql,mongo,closeDb} from '../lib/db.mjs';
const expectedScreens=['01-login.png','02-student-dashboard.png','03-search.png','04-matches.png','05-private-claim.png','06-staff-verification.png','07-handover.png','08-audit.png'];
const missingScreens=expectedScreens.filter(name=>!existsSync(new URL('../evidence/screenshots/'+name,import.meta.url)));
try{
 const db=await mongo();const result={generated_at:new Date().toISOString(),sql_engine:process.env.SQL_ENGINE||'native-postgresql',runtime_note:process.env.VERIFICATION_RUNTIME_NOTE||'Native database services configured by the operator.',postgresql_version:(await sql().query('SELECT version()')).rows[0].version,mongodb_version:(await db.admin().serverInfo()).version,
 columns:(await sql().query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name NOT IN ('item_directory','category_summary') ORDER BY table_name,ordinal_position")).rows,
 tables:(await sql().query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows,
 functions:(await sql().query("SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY proname")).rows,
 indexes:(await sql().query("SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY indexname")).rows,
 category_summary:(await sql().query('SELECT * FROM category_summary ORDER BY total DESC')).rows,
 mongodb_indexes:{item_profiles:await db.collection('item_profiles').indexes(),audit_events:await db.collection('audit_events').indexes()},
 pending_events:Number((await sql().query('SELECT count(*) FROM outbox_events WHERE processed_at IS NULL')).rows[0].count),
 limitations:['Screenshot presence does not establish complete browser interaction coverage.',...(missingScreens.length?['Missing screenshot files: '+missingScreens.join(', ')]:[]),...(process.env.SQL_ENGINE==='pglite'?['Native PostgreSQL simultaneous-approval test is skipped; use Docker setup to execute it.']:[])],
 seed_data:'24 synthetic reports, 4 synthetic demo accounts; integration tests add separate test records.',
};await writeFile('evidence/verification.json',JSON.stringify(result,null,2));console.log('Wrote verification.json');
}finally{await closeDb();}
