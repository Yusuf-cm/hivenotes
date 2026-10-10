// Runs only in a disposable classroom created by this script. Never prints tokens/passwords.
import { randomBytes } from 'node:crypto';
const base = process.env.TEST_API_URL || 'http://127.0.0.1:4000';
const password = randomBytes(24).toString('hex');
const studentPassword = randomBytes(24).toString('hex');
const nickname = `QA-${Date.now()}`;
let passed = 0;
async function call(path, method='GET', body, token, expected=200) {
 const response = await fetch(`${base}${path}`, {method, headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(60000)});
 if(response.status!==expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}`);
 passed++; return response.status===204 ? null : response.json();
}
const teacher = await call('/auth/create','POST',{nickname,password},undefined,201);
const student = await call('/auth/join','POST',{nickname:`${nickname}-student`,roomCode:teacher.roomCode,password:studentPassword,classPassword:password});
await call('/auth/join','POST',{nickname:`${nickname}-student`,roomCode:teacher.roomCode,password:'wrong-password'},undefined,401);
await call('/rooms/AAAAAA','GET',undefined,student.token,403);
const room = await call(`/rooms/${teacher.roomCode}`,'GET',undefined,student.token);
await call(`/pages/${student.pageIndex}`,'PATCH',{text:'QA: classroom persistence test'},student.token);
const note = await call('/notes','POST',{pageIndex:student.pageIndex,content:'QA: note persistence',color:'sage',x:80,y:80},student.token,201);
await call(`/notes/${note.id}`,'PATCH',{content:'QA: edited note'},student.token);
const returned = await call('/auth/join','POST',{nickname:`${nickname}-student`,roomCode:teacher.roomCode,password:studentPassword});
if(returned.userId!==student.userId) throw new Error('Returning student lost their identity');
const reloaded = await call(`/rooms/${teacher.roomCode}`,'GET',undefined,returned.token);
if(!reloaded.notes.some(n=>n.id===note.id&&n.content==='QA: edited note')) throw new Error('Saved note missing after rejoin');
await call(`/notes/${note.id}`,'DELETE',undefined,student.token,204);
console.log(`PASS: ${passed} classroom API checks; create/join/rejoin/save/edit/delete and room isolation. Disposable classroom code: ${teacher.roomCode}`);
