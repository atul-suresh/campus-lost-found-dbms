import {sql,closeDb} from '../lib/db.mjs';
import {createItem} from '../lib/service.mjs';
try{
 const users=(await sql().query("SELECT id,name,role,email FROM users WHERE email IN ('atul@campus.test','student085@campus.test')")).rows;
 const owner=users.find(u=>u.email==='atul@campus.test'),finder=users.find(u=>u.email==='student085@campus.test');
 if(!owner||!finder)throw Error('Run npm run db:setup before preparing the demonstration.');
 const category=(await sql().query("SELECT id FROM categories WHERE name='Bottles & lunchboxes'")).rows[0].id;
 const location=(await sql().query("SELECT id FROM locations WHERE name='Library'")).rows[0].id;
 const suffix=Date.now().toString(36).toUpperCase();
 const common={description:'Blue insulated steel bottle with a screw cap, last seen at the library.',category_id:category,location_id:location,event_date:new Date().toISOString().slice(0,10),color:'blue',attributes:{brand:'Milton',material:'Steel',capacity:'750 ml'},secret:'AS engraved beneath the base.'};
 const found=(await createItem(finder,{...common,kind:'found',title:'Demo blue bottle '+suffix})).item;
 const lost=(await createItem(owner,{...common,kind:'lost',title:'Demo missing blue bottle '+suffix})).item;
 console.log('\nA fresh synthetic demonstration pair is ready. Existing data is preserved.');
 console.log('Found report: '+found.title+' ('+found.reference_code+')');
 console.log('Lost report:  '+lost.title+' ('+lost.reference_code+')');
 console.log('1. Sign in as atul@campus.test. Open My reports and Find matches for the newest Demo missing blue bottle.');
 console.log('2. Open its matching found bottle. Submit evidence: AS engraved beneath the base. Link the matching lost report.');
 console.log('3. Sign in as staff@campus.test. Verify the private clue, approve and complete handover.');
 console.log('4. Show returned/handed_over and the closed lost report, then open Activity log.\n');
}finally{await closeDb();}
