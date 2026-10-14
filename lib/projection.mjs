import {sql,mongo} from './db.mjs';
export async function initializeMongo(){
 const db=await mongo();
 const validators={
 item_profiles:{$jsonSchema:{bsonType:'object',required:['_id','public','secret','event_id'],properties:{_id:{bsonType:'string'},public:{bsonType:'object'},secret:{bsonType:'string',maxLength:1000},event_id:{bsonType:['int','long','double']}}}},
 audit_events:{$jsonSchema:{bsonType:'object',required:['_id','event_type','entity_id','created_at'],properties:{_id:{bsonType:['int','long','double']},event_type:{bsonType:'string'},entity_id:{bsonType:'string'},created_at:{bsonType:'date'}}}}
 };
 for(const [name,validator]of Object.entries(validators)){
  if((await db.listCollections({name}).toArray()).length)await db.command({collMod:name,validator,validationLevel:'strict',validationAction:'error'});
  else await db.createCollection(name,{validator,validationLevel:'strict',validationAction:'error'});
 }
 await db.collection('item_profiles').createIndex({'public.brand':1});
 await db.collection('audit_events').createIndex({entity_id:1,created_at:-1});
 await db.collection('audit_events').createIndex({event_type:1,created_at:-1});
}
export async function syncOutbox(limit=100){
 const db=await mongo(),c=await sql().connect();let processed=0;
 try{
  // One transaction and row locks make competing workers safe. SQL is the source of truth.
  await c.query('BEGIN');
  if(!(await c.query('SELECT pg_try_advisory_xact_lock(776601) locked')).rows[0].locked){await c.query('ROLLBACK');return {processed:0,pending:Number((await c.query('SELECT count(*) FROM outbox_events WHERE processed_at IS NULL')).rows[0].count)};}
  const rows=(await c.query('SELECT * FROM outbox_events WHERE processed_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED',[limit])).rows;
  for(const e of rows){
   const id=Number(e.id);
   if(e.event_type==='profile.upsert'){
    const newer={$lt:[{$ifNull:['$event_id',0]},id]};
    await db.collection('item_profiles').updateOne({_id:e.entity_id},[{$set:{
     public:{$cond:[newer,{$literal:e.payload.public},'$public']},secret:{$cond:[newer,{$literal:e.payload.secret},'$secret']},event_id:{$max:[{$ifNull:['$event_id',0]},id]}
    }}],{upsert:true});
   }
   if(e.event_type==='items.delete')await db.collection('item_profiles').deleteOne({_id:e.entity_id});
   // Audit stores a safe summary; private item identifiers are excluded.
   await db.collection('audit_events').updateOne({_id:id},{$setOnInsert:{event_type:e.event_type,entity_id:e.entity_id,created_at:e.created_at,
    details:e.event_type==='profile.upsert'?{message:'Item details saved'}:e.payload}},{upsert:true});
   await c.query('UPDATE outbox_events SET processed_at=now(),payload=NULL WHERE id=$1',[e.id]);processed++;
  }
  await c.query('COMMIT');return {processed,pending:Number((await c.query('SELECT count(*) FROM outbox_events WHERE processed_at IS NULL')).rows[0].count)};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function bestEffortSync(){try{return {ok:true,...await syncOutbox()};}catch{return {ok:false,message:'Saved in PostgreSQL; document synchronization is pending.'};}}
export async function auditAggregation(){const db=await mongo();return db.collection('audit_events').aggregate([
 {$match:{event_type:{$ne:'profile.upsert'}}},{$group:{_id:'$event_type',count:{$sum:1},latest:{$max:'$created_at'}}},{$sort:{count:-1,_id:1}}
]).toArray();}
