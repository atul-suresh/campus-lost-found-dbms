import {sql,mongo,transaction} from './db.mjs';
import {AppError,uuid,itemInput,textValue} from './validation.mjs';
import {bestEffortSync,auditAggregation,syncOutbox} from './projection.mjs';
const staff=u=>{if(u.role!=='staff')throw new AppError('Staff access required',403);};
export async function directory(user,params=new URLSearchParams()){
 const values=[],clauses=[];const add=(clause,value)=>{values.push(value);clauses.push(clause.replace('?',`$${values.length}`));};
 if(params.get('mine')==='true')add('reporter_id=?',user.id);
 for(const key of ['kind','status','category_id','location_id'])if(params.get(key)&&params.get(key)!=='all')add(`${key}=?`,params.get(key));
 const search=params.get('q')?.trim();if(search){if(search.length>120)throw new AppError('Search is too long');add(`id IN (SELECT id FROM items WHERE search_vector @@ websearch_to_tsquery('english',?))`,search);}
 return (await sql().query(`SELECT * FROM item_directory ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY created_at DESC,id LIMIT 150`,values)).rows;
}
export async function getItem(user,id){
 uuid(id);const item=(await sql().query('SELECT * FROM item_directory WHERE id=$1',[id])).rows[0];if(!item)throw new AppError('Report not found',404);
 let details=null,documentPending=false;
 try{const doc=await (await mongo()).collection('item_profiles').findOne({_id:id});if(doc)details={...doc.public,...(user.role==='staff'||item.reporter_id===user.id?{secret:doc.secret}:{})};else documentPending=true;}catch{documentPending=true;}
 return {item,details,documentPending};
}
async function profile(c,id,data){await c.query(`INSERT INTO outbox_events(event_type,entity_id,payload) VALUES('profile.upsert',$1,$2::jsonb)`,[id,JSON.stringify({public:{...data.attributes,photo:data.photo},secret:data.secret})]);}
export async function createItem(user,body){
 const data=itemInput(body);const item=await transaction(async c=>{const r=await c.query(`INSERT INTO items(reporter_id,kind,title,description,category_id,location_id,event_date,color) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[user.id,data.kind,data.title,data.description,data.category_id,data.location_id,data.event_date,data.color]);await profile(c,r.rows[0].id,data);return r.rows[0];});
 return {item,sync:await bestEffortSync()};
}
export async function updateItem(user,id,body){
 uuid(id);const data=itemInput(body);const item=await transaction(async c=>{
 const old=(await c.query('SELECT * FROM items WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!old)throw new AppError('Report not found',404);
 if(old.reporter_id!==user.id&&user.role!=='staff')throw new AppError('Only the reporter or staff can edit',403);
 if(old.status!=='open')throw new AppError('Only open reports can be edited',409);if(old.kind!==data.kind)throw new AppError('Report kind cannot change');
 const r=await c.query(`UPDATE items SET title=$2,description=$3,category_id=$4,location_id=$5,event_date=$6,color=$7 WHERE id=$1 RETURNING *`,[id,data.title,data.description,data.category_id,data.location_id,data.event_date,data.color]);await profile(c,id,data);return r.rows[0];});
 return {item,sync:await bestEffortSync()};
}
export async function deleteItem(user,id){
 uuid(id);await transaction(async c=>{const item=(await c.query('SELECT * FROM items WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!item)throw new AppError('Report not found',404);
 if(item.reporter_id!==user.id&&user.role!=='staff')throw new AppError('Only the reporter or staff can delete',403);
 if(item.status!=='open')throw new AppError('Only open unclaimed reports can be deleted',409);
 if((await c.query('SELECT 1 FROM claims WHERE item_id=$1 OR linked_lost_id=$1 LIMIT 1',[id])).rowCount)throw new AppError('A report with claim history cannot be deleted',409);
 await c.query('DELETE FROM items WHERE id=$1',[id]);});return {deleted:true,sync:await bestEffortSync()};
}
export async function closeLost(user,id){uuid(id);const r=await sql().query(`UPDATE items SET status='closed' WHERE id=$1 AND kind='lost' AND status='open' AND (reporter_id=$2 OR $3='staff') RETURNING id`,[id,user.id,user.role]);if(!r.rowCount)throw new AppError('Only your open lost report can be closed',409);return {closed:true,sync:await bestEffortSync()};}
export async function matches(user,id){uuid(id);const lost=(await sql().query('SELECT reporter_id,kind,status FROM items WHERE id=$1',[id])).rows[0];if(!lost)throw new AppError('Report not found',404);if(lost.reporter_id!==user.id&&user.role!=='staff')throw new AppError('View matches for your own report',403);if(lost.kind!=='lost'||lost.status!=='open')throw new AppError('Choose an open lost report');return (await sql().query(`SELECT d.*,m.score,m.reasons FROM match_candidates($1) m JOIN item_directory d ON d.id=m.item_id ORDER BY m.score DESC,d.id`,[id])).rows;}
export async function createClaim(user,body){
 const item=uuid(body.item_id),statement=textValue(body.statement,'Ownership evidence',12,2000),lost=body.linked_lost_id?uuid(body.linked_lost_id):null;
 const r=await sql().query(`INSERT INTO claims(item_id,claimant_id,statement,linked_lost_id) VALUES($1,$2,$3,$4) RETURNING id,status`,[item,user.id,statement,lost]);return {claim:r.rows[0],sync:await bestEffortSync()};
}
export async function claimList(user){return (await sql().query(`SELECT c.*,i.title,i.reference_code,i.status item_status,u.name claimant_name,u.srn claimant_srn,l.title linked_lost_title FROM claims c JOIN items i ON i.id=c.item_id JOIN users u ON u.id=c.claimant_id LEFT JOIN items l ON l.id=c.linked_lost_id ${user.role==='staff'?'':'WHERE c.claimant_id=$1'} ORDER BY c.created_at DESC`,user.role==='staff'?[]:[user.id])).rows;}
export async function withdraw(user,id){uuid(id);const r=await sql().query(`UPDATE claims SET status='withdrawn' WHERE id=$1 AND claimant_id=$2 AND status='pending' RETURNING id`,[id,user.id]);if(!r.rowCount)throw new AppError('Only your pending claim can be withdrawn',409);return {withdrawn:true,sync:await bestEffortSync()};}
export async function review(user,id,b){staff(user);uuid(id);if(!['approved','rejected'].includes(b.decision))throw new AppError('Choose approve or reject');const note=textValue(b.note,'Review note',5,500);await sql().query('SELECT review_claim($1,$2,$3,$4)',[id,user.id,b.decision,note]);return {reviewed:true,sync:await bestEffortSync()};}
export async function handover(user,id,b){staff(user);uuid(id);const note=textValue(b.note,'Handover receipt',5,500);const r=await sql().query('SELECT confirm_handover($1,$2,$3) receipt_id',[id,user.id,note]);return {...r.rows[0],sync:await bestEffortSync()};}
export async function dashboard(user){
 const summary=(await sql().query('SELECT * FROM category_summary ORDER BY total DESC,category')).rows;
 const totals=(await sql().query(`SELECT count(*) total,count(*) FILTER(WHERE kind='lost' AND status='open') open_lost,count(*) FILTER(WHERE kind='found' AND status='open') open_found,count(*) FILTER(WHERE status='returned') returned FROM items`)).rows[0];
 const mine=(await sql().query(`SELECT count(*) reports FROM items WHERE reporter_id=$1`,[user.id])).rows[0];
 if(user.role!=='staff')return {totals,summary,mine};
 let audit=[],mongoAvailable=true;try{audit=await auditAggregation();}catch{mongoAvailable=false;}
 const pendingClaims=Number((await sql().query(`SELECT count(*) FROM claims WHERE status='pending'`)).rows[0].count);
 const pendingSync=Number((await sql().query('SELECT count(*) FROM outbox_events WHERE processed_at IS NULL')).rows[0].count);
 return {totals,summary,mine,audit,mongoAvailable,pendingClaims,pendingSync};
}
export async function auditLog(user,id){staff(user);if(id)uuid(id);try{return await (await mongo()).collection('audit_events').find(id?{entity_id:id}:{}).sort({created_at:-1,_id:-1}).limit(100).toArray();}catch{throw new AppError('Audit database unavailable; retry synchronization later',503);}}
export async function sync(user){staff(user);try{return await syncOutbox(300);}catch{throw new AppError('MongoDB unavailable. PostgreSQL events remain queued.',503);}}
export async function diagnostics(user){staff(user);const version=(await sql().query('SELECT version()')).rows[0].version;let mongodb=false;try{await (await mongo()).command({ping:1});mongodb=true;}catch{}return {postgresql:version,mongodb};}
