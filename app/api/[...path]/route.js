import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {authenticate,signIn,digest,hashPassword} from '../../../lib/auth.mjs';
import {sql} from '../../../lib/db.mjs';
import {AppError,textValue} from '../../../lib/validation.mjs';
import * as svc from '../../../lib/service.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const cookieName='campus_session';
async function handle(req,{params}){
 try{
  const {path=[]}=await params,endpoint=path.join('/'),method=req.method,url=new URL(req.url);
  if(method!=='GET'){
   const allowed=process.env.APP_ORIGIN||url.origin;
   if(req.headers.get('origin')!==allowed)throw new AppError('Request origin is not allowed',403);
   const length=Number(req.headers.get('content-length')||0);if(length>1100000)throw new AppError('Request too large',413);
  }
  let b={};if(['POST','PUT'].includes(method)){
   if(!(req.headers.get('content-type')||'').includes('application/json'))throw new AppError('JSON body required',415);
   const raw=await req.text();if(raw.length>1100000)throw new AppError('Request too large',413);
   try{b=JSON.parse(raw);}catch{throw new AppError('Invalid JSON');}if(!b||typeof b!=='object'||Array.isArray(b))throw new AppError('JSON object required');
  }
  const jar=await cookies(),token=jar.get(cookieName)?.value;
  if(endpoint==='auth/login'&&method==='POST'){
   const email=textValue(b.email,'Email',3,160),password=textValue(b.password,'Password',1,128);
   const signed=await signIn(email,password);jar.set(cookieName,signed.token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',path:'/',maxAge:43200});return NextResponse.json({user:signed.user});
  }
  if(endpoint==='auth/register'&&method==='POST'){
   const name=textValue(b.name,'Name',2,80),srn=textValue(b.srn,'SRN',3,25).toUpperCase(),email=textValue(b.email,'Email',5,160).toLowerCase(),password=textValue(b.password,'Password',10,128);
   if(!/^[A-Z0-9_-]{3,25}$/.test(srn)||!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))throw new AppError('Invalid SRN or email');
   await sql().query(`INSERT INTO users(name,srn,email,password_hash,role) VALUES($1,$2,$3,$4,'student')`,[name,srn,email,await hashPassword(password)]);return NextResponse.json({registered:true},{status:201});
  }
  const user=await authenticate(token);if(!user)throw new AppError('Please sign in',401);
  if(endpoint==='auth/me'&&method==='GET')return NextResponse.json({user});
  if(endpoint==='auth/logout'&&method==='POST'){await sql().query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);jar.delete(cookieName);return NextResponse.json({loggedOut:true});}
  if(endpoint==='lookups'&&method==='GET')return NextResponse.json({categories:(await sql().query('SELECT * FROM categories ORDER BY id')).rows,locations:(await sql().query('SELECT * FROM locations ORDER BY id')).rows});
  if(endpoint==='items'&&method==='GET')return NextResponse.json({items:await svc.directory(user,url.searchParams)});
  if(endpoint==='items'&&method==='POST')return NextResponse.json(await svc.createItem(user,b),{status:201});
  if(path[0]==='items'&&path.length===2){if(method==='GET')return NextResponse.json(await svc.getItem(user,path[1]));if(method==='PUT')return NextResponse.json(await svc.updateItem(user,path[1],b));if(method==='DELETE')return NextResponse.json(await svc.deleteItem(user,path[1]));}
  if(path[0]==='items'&&path[2]==='matches'&&path.length===3&&method==='GET')return NextResponse.json({matches:await svc.matches(user,path[1])});
  if(path[0]==='items'&&path[2]==='close'&&path.length===3&&method==='POST')return NextResponse.json(await svc.closeLost(user,path[1]));
  if(endpoint==='claims'&&method==='GET')return NextResponse.json({claims:await svc.claimList(user)});
  if(endpoint==='claims'&&method==='POST')return NextResponse.json(await svc.createClaim(user,b),{status:201});
  if(path[0]==='claims'&&path.length===3&&method==='POST'){
   if(path[2]==='withdraw')return NextResponse.json(await svc.withdraw(user,path[1]));
   if(path[2]==='review')return NextResponse.json(await svc.review(user,path[1],b));
   if(path[2]==='handover')return NextResponse.json(await svc.handover(user,path[1],b));
  }
  if(endpoint==='dashboard'&&method==='GET')return NextResponse.json(await svc.dashboard(user));
  if(endpoint==='audit'&&method==='GET')return NextResponse.json({events:await svc.auditLog(user,url.searchParams.get('id'))});
  if(endpoint==='sync'&&method==='POST')return NextResponse.json(await svc.sync(user));
  if(endpoint==='diagnostics'&&method==='GET')return NextResponse.json(await svc.diagnostics(user));
  throw new AppError('Endpoint not found',404);
 }catch(e){
  if(e.status)return NextResponse.json({error:e.message},{status:e.status});
  const messages={'23505':'An account or active claim already exists','23503':'A referenced record is missing or has dependent history','23514':'The record violates a database validation rule','22P02':'Invalid filter or identifier','P0001':e.message,'22001':'A field exceeds its allowed length'};
  if(messages[e.code])return NextResponse.json({error:messages[e.code]},{status:409});
  console.error('Request failed:',e.code||e.name);return NextResponse.json({error:'Service unavailable. Check the database connections and try again.'},{status:503});
 }
}
export const GET=handle,POST=handle,PUT=handle,DELETE=handle;
