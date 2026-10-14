import {sql,transaction} from '../lib/db.mjs';
import {hashPassword} from '../lib/auth.mjs';
export async function seed(){
 const password=process.env.DEMO_PASSWORD;if(!password||password.length<10)throw new Error('Set DEMO_PASSWORD with at least 10 characters before seeding');
 const categories=['Electronics','Bottles & lunchboxes','Books & stationery','Bags','Keys & accessories','Clothing','Sports equipment'];
 const locations=['Library','CSE Block','Cafeteria','Student Centre','Sports Ground','Main Gate'];
 for(const name of categories)await sql().query('INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);
 for(const name of locations)await sql().query('INSERT INTO locations(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);
 const accounts=[['Atul Suresh','PES1UG24CS098','atul@campus.test','student'],['Aryan Musale','PES1UG24CS085','student085@campus.test','student'],['Demo Student','DEMO_STUDENT','student@campus.test','student'],['Campus Helpdesk','STAFF_DEMO','staff@campus.test','staff']];
 for(const [name,srn,email,role]of accounts)await sql().query('INSERT INTO users(name,srn,email,role,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING',[name,srn,email,role,await hashPassword(password)]);
 // Do not overwrite real or existing reports. The seed is idempotent.
 if(Number((await sql().query('SELECT count(*) FROM items')).rows[0].count)>0)return;
 const u=(await sql().query('SELECT * FROM users')).rows,byEmail=email=>u.find(x=>x.email===email).id;
 const cats=(await sql().query('SELECT * FROM categories')).rows,locs=(await sql().query('SELECT * FROM locations')).rows;
 const entries=[
 ['lost','Blue steel water bottle','Blue insulated steel bottle misplaced after studying at the library.',1,0,'blue','atul@campus.test','Milton','Small initials on the underside'],
 ['found','Blue insulated bottle','A blue steel bottle left on the library reading table.',1,0,'blue','student085@campus.test','Milton','Initials AS engraved under the base'],
 ['lost','Black wireless earbuds','Black earbuds in a compact charging case, lost near the CSE lab.',0,1,'black','atul@campus.test','boAt','Sticker inside the lid'],
 ['found','Black earbuds case','A compact black wireless earbuds charging case found outside the lab.',0,1,'black','student085@campus.test','boAt','A small red sticker inside the lid'],
 ['lost','Database systems textbook','Database systems textbook with handwritten page notes.',2,0,'white','student085@campus.test','McGraw Hill','Name written on page 4'],
 ['found','Database textbook','A database textbook with handwritten notes found in the library.',2,0,'white','student@campus.test','McGraw Hill','Name inside on page 4'],
 ['lost','Green canvas backpack','Green canvas backpack with a laptop sleeve left at the cafeteria.',3,2,'green','atul@campus.test','Wildcraft','Keychain in the inner pocket'],
 ['found','Green laptop backpack','Green fabric backpack found near the cafeteria counter.',3,2,'green','student085@campus.test','Wildcraft','Purple keychain inside the pocket'],
 ['lost','House keys with ring','Two house keys on a circular metal ring near the student centre.',4,3,'silver','student085@campus.test','','Blue tag on the keyring'],
 ['found','Metal keyring','Two metal keys on a ring collected at the student centre.',4,3,'silver','student@campus.test','','Blue tag with a faded number'],
 ['lost','Red sports jacket','Red zip jacket misplaced after practice at the sports ground.',5,4,'red','atul@campus.test','Decathlon','White initials inside the collar'],
 ['found','Red zip jacket','Red sports jacket hanging near the ground seating area.',5,4,'red','student085@campus.test','Decathlon','Initials on the inner collar'],
 ['lost','Scientific calculator','Grey scientific calculator last used in the CSE lecture room.',0,1,'grey','student085@campus.test','Casio','Tape around the battery cover'],
 ['found','Grey calculator','Grey scientific calculator found on a lecture desk.',0,1,'grey','student@campus.test','Casio','Blue tape on the battery cover'],
 ['found','Brown wallet','Brown wallet handed to the helpdesk. No sensitive card details displayed.',4,5,'brown','student@campus.test','','Identity card stored privately at the helpdesk'],
 ['found','Yellow umbrella','Yellow folding umbrella found by the main gate.',5,5,'yellow','student085@campus.test','','Black cord handle'],
 ['found','White charging cable','White USB charging cable found at the CSE study area.',0,1,'white','student@campus.test','','Scuff near the connector'],
 ['found','Blue badminton racket','Blue badminton racket left near the sports ground.',6,4,'blue','student085@campus.test','Yonex','Orange grip tape'],
 ['lost','Purple notebook','Purple notebook with algorithms notes lost at the student centre.',2,3,'purple','atul@campus.test','','Doodle on the back cover'],
 ['found','Black lunchbox','Black rectangular lunchbox found near the cafeteria benches.',1,2,'black','student@campus.test','Milton','Small flower sticker on the bottom'],
 ['lost','White bicycle helmet','White bicycle helmet left near the main gate cycle stand.',6,5,'white','student085@campus.test','','Green sticker underneath'],
 ['found','White cycle helmet','White helmet collected from the main gate cycle stand.',6,5,'white','student@campus.test','','Green sticker underneath'],
 ['found','Orange pencil pouch','Orange pencil pouch found on a library desk.',2,0,'orange','student@campus.test','','Two mechanical pencils inside'],
 ['lost','Black power bank','Black portable power bank missing after a cafeteria visit.',0,2,'black','atul@campus.test','Mi','Scratch across one corner']
 ];
 const ids=[];
 await transaction(async c=>{
  for(let n=0;n<entries.length;n++){
   const [kind,title,description,cat,loc,color,email,brand,secret]=entries[n];
   const day=new Date(Date.now()-(n%5)*86400000).toISOString().slice(0,10);
   const item=(await c.query('INSERT INTO items(reporter_id,kind,title,description,category_id,location_id,event_date,color) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[byEmail(email),kind,title,description,cats.find(x=>x.name===categories[cat]).id,locs.find(x=>x.name===locations[loc]).id,day,color])).rows[0].id;ids.push(item);
   await c.query("INSERT INTO outbox_events(event_type,entity_id,payload) VALUES('profile.upsert',$1,$2::jsonb)",[item,JSON.stringify({public:{brand,material:kind==='found'?'Reported at campus helpdesk':'Not specified',photo:null},secret})]);
  }
  // Genuine sample workflows: one pending claim, one reserved item, one returned item.
  for(const [index,lostIndex,claimant,decision]of [[1,0,'atul@campus.test','pending'],[3,2,'atul@campus.test','approved'],[5,4,'student085@campus.test','handed_over']]){
   const claim=(await c.query('INSERT INTO claims(item_id,claimant_id,linked_lost_id,statement) VALUES($1,$2,$3,$4) RETURNING id',[ids[index],byEmail(claimant),ids[lostIndex],'Sample ownership proof for the synthetic demonstration item. Please verify identifying marks in person.'])).rows[0].id;
   if(decision!=='pending')await c.query('SELECT review_claim($1,$2,$3,$4)',[claim,byEmail('staff@campus.test'),'approved','Sample evidence verified for the seeded demo']);
   if(decision==='handed_over')await c.query('SELECT confirm_handover($1,$2,$3)',[claim,byEmail('staff@campus.test'),'Synthetic demo handover receipt']);
  }
 });
 console.log(`Seeded ${entries.length} synthetic item reports and 4 demo accounts.`);
}
