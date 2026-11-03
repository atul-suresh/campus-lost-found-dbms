import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {sql,mongo,closeDb} from '../lib/db.mjs';
import {initializeMongo,syncOutbox} from '../lib/projection.mjs';
import {seed} from '../scripts/seed.mjs';

if(process.env.ALLOW_TEST_DATABASE!=='true'||!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')||!process.env.MONGODB_DB?.endsWith('_test'))throw Error('Browser tests require explicitly isolated SQL and MongoDB test databases.');
await mkdir('evidence/screenshots',{recursive:true});
await sql().query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await (await mongo()).dropDatabase();
await sql().query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
await initializeMongo();await seed();await syncOutbox(300);await closeDb();

const origin='http://localhost:3200';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3200','--hostname','127.0.0.1'],{env:{...process.env,APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});
let serverLog='';for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{serverLog+=data;});
const results=[],screenshots=[],pageErrors=[];
let browser,page;
const check=async(name,work)=>{await work();results.push({name,status:'passed'});console.log('PASS '+name);};
try{
 let ready=false;for(let n=0;n<60;n++){try{await fetch(origin,{signal:AbortSignal.timeout(2000)});ready=true;break;}catch{await delay(250);}}
 if(!ready)throw Error('Browser server did not start: '+serverLog);
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Kolkata'});
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message));
 const shot=async name=>{await page.screenshot({path:'evidence/screenshots/'+name,fullPage:false});screenshots.push(name);};
 const nav=async label=>{await page.locator('aside nav').getByRole('button',{name:new RegExp(label)}).click();};
 const login=async email=>{await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(process.env.DEMO_PASSWORD);await page.getByRole('button',{name:/^Sign in/}).click();await page.locator('aside').waitFor();await page.locator('.stat b').first().filter({hasText:/\d/}).waitFor();};
 const logout=async()=>{await page.locator('aside').getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();};
 const title='Demo blue steel bottle';
 const lostTitle='Demo missing blue steel bottle';
 const create=async(kind,itemTitle)=>{
  await page.getByRole('button',{name:kind==='found'?/I found something/:/I lost something/}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Item title',{exact:true}).fill(itemTitle);
  await dialog.getByLabel('Public description').fill('Blue insulated steel bottle with a sturdy screw cap, reported at the library.');
  await dialog.getByLabel('Category').selectOption({label:'Bottles & lunchboxes'});
  await dialog.getByLabel('Location').selectOption({label:'Library'});
  await dialog.getByLabel('Color',{exact:true}).fill('blue');
  await dialog.getByLabel('Brand (public)',{exact:true}).fill('Milton');
  await dialog.getByLabel('Material (public)',{exact:true}).fill('Steel');
  await dialog.getByLabel('Capacity (public)',{exact:true}).fill('750 ml');
  await dialog.getByLabel('Private identifying detail',{exact:true}).fill('AS engraved beneath the base.');
  await dialog.getByRole('button',{name:/Save report/}).click();await dialog.waitFor({state:'hidden'});
 };
 const card=()=>page.getByRole('button').filter({has:page.getByRole('heading',{name:title,exact:true})});
 const claim=()=>page.locator('.claimCard').filter({has:page.getByRole('heading',{name:title,exact:true})});
 await check('sign-in screen renders with labelled fields',async()=>{await page.goto(origin);await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');await shot('01-login.png');});
 await check('student overview loads real seeded counts',async()=>{await login('atul@campus.test');assert.equal(await page.locator('aside nav').getByRole('button',{name:/Activity log/}).count(),0);await shot('02-student-dashboard.png');});
 await logout();await login('student085@campus.test');
 await check('found report form persists the category descriptor',async()=>{await create('found',title);await nav('Browse reports');await page.getByRole('searchbox').count();await page.getByLabel('Search reports').fill(title);await card().click();await page.getByText('750 ml',{exact:true}).waitFor();});
 await check('editing a report retains its descriptor and private clue',async()=>{
  await page.getByRole('dialog').getByRole('button',{name:'Edit report',exact:true}).click();
  const dialog=page.getByRole('dialog');assert.equal(await dialog.getByLabel('Capacity (public)',{exact:true}).inputValue(),'750 ml');
  await dialog.getByLabel('Public description').fill('Blue insulated steel bottle with a sturdy screw cap, found on a library reading desk.');
  await dialog.getByRole('button',{name:/Save report/}).click();await dialog.waitFor({state:'hidden'});
  await card().click();await page.getByText('750 ml',{exact:true}).waitFor();await page.getByText('AS engraved beneath the base.',{exact:true}).waitFor();await page.getByRole('button',{name:'Close report',exact:true}).click();
 });
 await logout();await login('atul@campus.test');
 await check('lost report form creates a claimant-owned report',async()=>{await create('lost',lostTitle);});
 await check('search and filters show the expected found report',async()=>{await nav('Browse reports');await page.getByLabel('Search reports').fill('blue bottle');await page.getByLabel('Report type').selectOption('found');await card().waitFor();await shot('03-search.png');});
 await check('matching presents the found candidate with explanations',async()=>{
  await nav('My reports');const row=page.getByRole('row').filter({has:page.getByRole('button',{name:lostTitle,exact:true})});
  await row.getByRole('button',{name:/Find matches/}).click();await card().waitFor();await page.getByText(/same category/).first().waitFor();await shot('04-matches.png');
 });
 await check('unrelated students cannot see the found report private clue',async()=>{await card().click();const dialog=page.getByRole('dialog');assert.equal(await dialog.getByText('AS engraved beneath the base.',{exact:true}).count(),0);await dialog.getByText('750 ml',{exact:true}).waitFor();});
 await check('ownership claim links to the student lost report',async()=>{
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Ownership evidence',{exact:true}).fill('AS engraved beneath the base. I can identify the bottle in person.');
  await dialog.getByLabel('Link your lost report (optional)').selectOption({label:lostTitle});
  await dialog.getByRole('button',{name:'Submit ownership claim',exact:true}).click();await dialog.waitFor({state:'hidden'});await claim().getByText('pending',{exact:true}).waitFor();await shot('05-private-claim.png');
 });
 await logout();await login('staff@campus.test');await nav('Verification desk');
 await check('staff verification displays the private ownership evidence',async()=>{
  await claim().getByText(/I can identify the bottle in person/).waitFor();
  await claim().getByRole('button',{name:'View item details',exact:true}).click();await page.getByRole('dialog').getByText('AS engraved beneath the base.',{exact:true}).waitFor();await shot('06-staff-verification.png');await page.getByRole('button',{name:'Close report',exact:true}).click();
 });
 await check('staff approval reserves the item',async()=>{
  await claim().getByRole('button',{name:'Approve claim',exact:true}).click();const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Review reason',{exact:true}).fill('Engraved initials and capacity verified with the claimant in person.');await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await dialog.waitFor({state:'hidden'});await claim().getByText('approved',{exact:true}).waitFor();
 });
 await check('handover completes the claim and returns the item',async()=>{
  await claim().getByRole('button',{name:'Complete handover',exact:true}).click();const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Receipt note',{exact:true}).fill('Bottle collected by the verified owner at the campus helpdesk.');await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await dialog.waitFor({state:'hidden'});await claim().getByText('handed over',{exact:true}).waitFor();await shot('07-handover.png');
  await claim().getByRole('button',{name:'View item details',exact:true}).click();await page.getByRole('dialog').getByText('returned',{exact:true}).waitFor();await page.getByRole('button',{name:'Close report',exact:true}).click();
 });
 await check('handover closes the linked lost report',async()=>{
  const response=await page.request.get(origin+'/api/items?mine=false&q='+encodeURIComponent(lostTitle));const data=await response.json();assert.equal(data.items.find(i=>i.title===lostTitle).status,'closed');
 });
 await check('staff audit history and event aggregation render',async()=>{await nav('Activity log');await page.locator('.auditStat').first().waitFor();await page.getByRole('cell',{name:'handovers.insert',exact:true}).first().waitFor();await shot('08-audit.png');});
 await check('logout clears staff navigation and allows a fresh student session',async()=>{await logout();assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'');await login('atul@campus.test');assert.equal(await page.locator('aside nav').getByRole('button',{name:/Activity log/}).count(),0);});
 await check('student overview remains usable at mobile width',async()=>{await page.setViewportSize({width:390,height:844});await page.getByRole('heading',{name:/Hello, Atul/}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await shot('09-mobile.png');});
 await check('browser reports no uncaught application errors',async()=>assert.deepEqual(pageErrors,[]));
 await writeFile('evidence/browser_results.json',JSON.stringify({generated_at:new Date().toISOString(),browser:await browser.version(),viewport:'1440x1000 desktop and 390x844 mobile',database:'Separate seeded browser test databases',results,screenshots,page_errors:pageErrors},null,2));
 await unlink('evidence/browser_failure.txt').catch(()=>{});await unlink('evidence/browser_failure.png').catch(()=>{});
 console.log(`${results.length} browser checks passed; ${screenshots.length} genuine screenshots captured.`);
}catch(error){
 await page?.screenshot({path:'evidence/browser_failure.png',fullPage:false}).catch(()=>{});
 await writeFile('evidence/browser_failure.txt',String(error.stack)+'\n'+serverLog);throw error;
}finally{await browser?.close();server.kill('SIGTERM');await closeDb();}
