import {readFile} from 'node:fs/promises';
import {sql,closeDb} from '../lib/db.mjs';
import {auditAggregation} from '../lib/projection.mjs';
try{const result=await sql().query(await readFile(new URL('../db/queries.sql',import.meta.url),'utf8'));for(const [i,r]of result.entries())console.log(JSON.stringify({statement:i+1,command:r.command,rows:r.rows}));console.log(JSON.stringify({mongoAggregation:await auditAggregation()}));}finally{await closeDb();}
