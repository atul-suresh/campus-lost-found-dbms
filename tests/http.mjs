import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
if(process.env.ALLOW_TEST_DATABASE!=='true'||!new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))throw new Error('Use only an explicit test database');
const origin='http://localhost:3100',results=[];
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3100','--hostname','127.0.0.1'],{env:{...process.env,APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});let serverLog='';server.stdout.on('data',b=>{serverLog+=b;console.log(String(b));});server.stderr.on('data',b=>{serverLog+=b;console.error(String(b));});
let cookie='';
async function call(path,method='GET',body,custom={}){const r=await fetch(origin+'/api/'+path,{signal:AbortSignal.timeout(12000),method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{origin,'content-type':'application/json'}:{}),...custom},body:body?JSON.stringify(body):undefined});return {r,data:await r.json()};}
async function check(name,fn){await writeFile('evidence/http_progress.txt',name);await fn();results.push({name,status:'passed'});console.log('PASS',name);}
try{
 let up=false;for(let n=0;n<40;n++){try{await fetch(origin,{signal:AbortSignal.timeout(2500)});up=true;break;}catch{await delay(300);}}if(!up)throw new Error(serverLog);
 await check('anonymous API access rejected',async()=>assert.equal((await call('items')).r.status,401));
 await check('cross-origin login rejected',async()=>assert.equal((await call('auth/login','POST',{email:'atul@campus.test',password:process.env.DEMO_PASSWORD},{origin:'https://untrusted.test'})).r.status,403));
 await check('student signs in with protected cookie',async()=>{const {r,data}=await call('auth/login','POST',{email:'atul@campus.test',password:process.env.DEMO_PASSWORD});assert.equal(r.status,200);assert.equal(data.user.role,'student');const c=r.headers.get('set-cookie');assert.match(c,/httponly/i);assert.match(c,/samesite=lax/i);cookie=c.split(';')[0];});
 await check('dashboard and directory use database data',async()=>{assert.ok((await call('items')).data.items.length>0);assert.ok(Number((await call('dashboard')).data.totals.total)>0);});
 await check('student denied staff synchronization route',async()=>assert.equal((await call('sync','POST',{})).r.status,403));
 await check('student denied staff audit route',async()=>assert.equal((await call('audit')).r.status,403));
 await check('invalid report request rejected',async()=>assert.equal((await call('items','POST',{kind:'found'})).r.status,400));
 await check('SQL-looking search stays a harmless search',async()=>assert.equal((await call('items?q='+encodeURIComponent("'; DROP TABLE users; --"))).r.status,200));
 await check('register ignores an attempted staff role',async()=>{const suffix=Date.now();const data={name:'HTTP Test Student',srn:'HTTP_'+suffix,email:`http${suffix}@campus.test`,password:'A-valid-test-password',role:'staff'};assert.equal((await call('auth/register','POST',data)).r.status,201);const signed=await call('auth/login','POST',{email:data.email,password:data.password});assert.equal(signed.data.user.role,'student');});
 await check('logout revokes the original session',async()=>{assert.equal((await call('auth/logout','POST',{})).r.status,200);assert.equal((await call('auth/me')).r.status,401);});
 await check('staff can access aggregation and diagnostics',async()=>{const signed=await call('auth/login','POST',{email:'staff@campus.test',password:process.env.DEMO_PASSWORD});cookie=signed.r.headers.get('set-cookie').split(';')[0];const d=await call('dashboard');assert.ok(Array.isArray(d.data.audit));const diag=await call('diagnostics');assert.equal(diag.data.mongodb,true);assert.match(diag.data.postgresql,/PostgreSQL/);});
 await check('staff synchronization returns pending count',async()=>{const r=await call('sync','POST',{});assert.equal(r.r.status,200);assert.equal(r.data.pending,0);});

 let foundId,lostId,claimId,categoryId,locationId;
 await check('HTTP found report persists through the API',async()=>{const l=await call('lookups');categoryId=l.data.categories[0].id;locationId=l.data.locations[0].id;const r=await call('items','POST',{kind:'found',title:'HTTP verified headphones',description:'A pair of black over-ear headphones found by the library.',category_id:categoryId,location_id:locationId,event_date:new Date().toISOString().slice(0,10),color:'black',attributes:{brand:'TestBrand'},secret:'Private initials HTTP-X'});assert.equal(r.r.status,201);foundId=r.data.item.id;assert.equal(r.data.item.event_date,new Date().toISOString().slice(0,10));});
 await check('HTTP private profile hides the staff identifying clue from students',async()=>{const signed=await call('auth/login','POST',{email:'atul@campus.test',password:process.env.DEMO_PASSWORD});cookie=signed.r.headers.get('set-cookie').split(';')[0];const d=await call('items/'+foundId);assert.equal(d.data.details.secret,undefined);});
 await check('HTTP lost report obtains matching candidates',async()=>{const r=await call('items','POST',{kind:'lost',title:'HTTP black headphones',description:'Black over-ear headphones misplaced while studying in the library.',category_id:categoryId,location_id:locationId,event_date:new Date().toISOString().slice(0,10),color:'black'});assert.equal(r.r.status,201);lostId=r.data.item.id;assert.ok((await call('items/'+lostId+'/matches')).data.matches.some(x=>x.id===foundId));});
 await check('HTTP ownership claim accepts a valid linked lost report',async()=>{const r=await call('claims','POST',{item_id:foundId,linked_lost_id:lostId,statement:'Private initials HTTP-X are engraved beneath the headband.'});assert.equal(r.r.status,201);claimId=r.data.claim.id;});
 await check('HTTP student review attempt is denied',async()=>assert.equal((await call('claims/'+claimId+'/review','POST',{decision:'approved',note:'Attempt by student'})).r.status,403));
 await check('HTTP staff approves the ownership claim',async()=>{const signed=await call('auth/login','POST',{email:'staff@campus.test',password:process.env.DEMO_PASSWORD});cookie=signed.r.headers.get('set-cookie').split(';')[0];assert.equal((await call('claims/'+claimId+'/review','POST',{decision:'approved',note:'Identifying initials verified in person'})).r.status,200);assert.equal((await call('items/'+foundId)).data.item.status,'reserved');});
 await check('HTTP handover returns found item and closes lost report',async()=>{assert.equal((await call('claims/'+claimId+'/handover','POST',{note:'Owner collected headphones at campus helpdesk'})).r.status,200);assert.equal((await call('items/'+foundId)).data.item.status,'returned');assert.equal((await call('items/'+lostId)).data.item.status,'closed');});
 const page=await fetch(origin);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('Campus Lost'));assert.equal(page.headers.get('x-frame-options'),'DENY');results.push({name:'production page and security headers served',status:'passed'});
 await writeFile('evidence/http_results.json',JSON.stringify({generated_at:new Date().toISOString(),results,browser_qa:'Not performed in this environment.'},null,2));
 console.log(`${results.length} HTTP checks passed`);
}finally{server.kill('SIGTERM');}
