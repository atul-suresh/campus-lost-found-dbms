import {readFile} from 'node:fs/promises';
import {sql,closeDb} from '../lib/db.mjs';
import {initializeMongo,syncOutbox} from '../lib/projection.mjs';
import {seed} from './seed.mjs';
try{
 await sql().query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
 await initializeMongo();await seed();
 let result;do{result=await syncOutbox(300);}while(result.pending>0);
 console.log('Schema, MongoDB validators/indexes, and synthetic demo data are ready.');
}finally{await closeDb();}
