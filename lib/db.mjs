import pg from 'pg';
import { MongoClient } from 'mongodb';
// Calendar dates must stay YYYY-MM-DD; converting DATE to a JS Date can shift
// the day when the server and browser use different time zones.
pg.types.setTypeParser(1082,value=>value);
const state=globalThis.__campusDb??= {};
export function sql(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 return state.pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:Number(process.env.DB_POOL_MAX||10),connectionTimeoutMillis:4000});
}
export async function mongo(){
 if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');
 if(!state.mongoPromise){state.mongoClient=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:2500});state.mongoPromise=state.mongoClient.connect().catch(e=>{state.mongoPromise=null;throw e;});}
 await state.mongoPromise;return state.mongoClient.db(process.env.MONGODB_DB||'campus_lost_found');
}
export async function transaction(work){const c=await sql().connect();try{await c.query('BEGIN');const value=await work(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function closeDb(){await state.pool?.end();await state.mongoClient?.close();delete state.pool;delete state.mongoPromise;delete state.mongoClient;}
