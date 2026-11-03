import {readFileSync,writeFileSync} from 'node:fs';
const url=new URL(process.env.DATABASE_URL);
const browser=process.argv.includes('--browser');
const name=browser?'campus_lost_found_browser_test':'campus_lost_found_test';
url.pathname='/'+name;
const values={DATABASE_URL:url.href,MONGODB_URI:process.env.MONGODB_URI,
 MONGODB_DB:name,DEMO_PASSWORD:process.env.DEMO_PASSWORD,
 ALLOW_TEST_DATABASE:'true',SQL_ENGINE:'native-postgresql',COOKIE_SECURE:'false'};
for(const [key,value]of Object.entries(values))if(value===undefined)throw Error('Missing '+key);
writeFileSync(browser?'.env.browser':'.env.test',Object.entries(values).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
console.log('Prepared explicitly isolated PostgreSQL and MongoDB test settings.');
