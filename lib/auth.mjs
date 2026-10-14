import {randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {sql} from './db.mjs';
const scrypt=promisify(rawScrypt);
export const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return `scrypt:${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password,stored){const [algo,salt,hex]=stored.split(':');if(algo!=='scrypt')return false;const derived=await scrypt(password,salt,64);const expected=Buffer.from(hex,'hex');return expected.length===derived.length&&timingSafeEqual(expected,derived);}
export async function signIn(email,password){
 const key=digest(email.toLowerCase());
 const attempt=(await sql().query('SELECT * FROM login_attempts WHERE identifier=$1',[key])).rows[0];
 if(attempt?.blocked_until&&new Date(attempt.blocked_until)>new Date())throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'),{status:429});
 const user=(await sql().query('SELECT * FROM users WHERE email=$1',[email.toLowerCase()])).rows[0];
 // Do the same expensive hash even when the email is unknown.
 const valid=await verifyPassword(password,user?.password_hash||`scrypt:00000000000000000000000000000000:${'00'.repeat(64)}`);
 if(!user||!valid){await sql().query(`INSERT INTO login_attempts(identifier,failures) VALUES($1,1) ON CONFLICT(identifier) DO UPDATE SET
 failures=CASE WHEN login_attempts.blocked_until<now() THEN 1 ELSE login_attempts.failures+1 END,
 blocked_until=CASE WHEN login_attempts.failures>=4 AND (login_attempts.blocked_until IS NULL OR login_attempts.blocked_until>now()) THEN now()+interval '15 minutes' ELSE NULL END`,[key]);throw Object.assign(new Error('Incorrect email or password'),{status:401});}
 await sql().query('DELETE FROM login_attempts WHERE identifier=$1',[key]);
 const token=randomBytes(32).toString('hex');
 await sql().query(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')`,[digest(token),user.id]);
 return {token,user:publicUser(user)};
}
export function publicUser(u){return {id:u.id,name:u.name,srn:u.srn,email:u.email,role:u.role};}
export async function authenticate(token){if(!token)return null;return (await sql().query(`SELECT u.id,u.name,u.srn,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)])).rows[0]||null;}
