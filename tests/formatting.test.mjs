import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {descriptorFor,editableAttributes} from '../lib/descriptors.mjs';

test('category descriptors select the correct public field',()=>{
 assert.equal(descriptorFor('Electronics').key,'model');
 assert.equal(descriptorFor('Bottles & lunchboxes').key,'capacity');
 assert.equal(descriptorFor('Clothing').key,'size');
});
test('editing preserves flexible fields and separates secret/photo',()=>{
 const result=editableAttributes({brand:'Milton',capacity:'750 ml',custom:'keep me',secret:'private',photo:'data'});
 assert.equal(result.capacity,'750 ml');assert.equal(result.custom,'keep me');
 assert.equal(result.secret,undefined);assert.equal(result.photo,undefined);
});
test('calendar date display is stable in India and California',()=>{
 const helper=new URL('../lib/descriptors.mjs',import.meta.url).href;
 for(const TZ of ['Asia/Kolkata','America/Los_Angeles']){
  const output=execFileSync(process.execPath,['--input-type=module','-e',`import {formatDate} from ${JSON.stringify(helper)};console.log(formatDate('2026-10-29'));`],{env:{...process.env,TZ},encoding:'utf8'});
  assert.match(output,/29 Oct 2026/);
 }
});
