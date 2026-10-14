import {syncOutbox} from '../lib/projection.mjs';
import {closeDb} from '../lib/db.mjs';
const watch=process.argv.includes('--watch');
async function run(){try{console.log(new Date().toISOString(),await syncOutbox(300));}catch(e){console.error('Synchronization failed; events retained:',e.code||e.name);if(!watch)process.exitCode=1;}}
await run();if(watch){const timer=setInterval(run,10000);process.on('SIGINT',async()=>{clearInterval(timer);await closeDb();process.exit();});}else await closeDb();
