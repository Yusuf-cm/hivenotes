// Runs only in a disposable classroom created by this script. Never prints tokens/passwords.
import { randomBytes } from 'node:crypto';
import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';
const base = process.env.TEST_API_URL || 'http://127.0.0.1:4000';
const password = randomBytes(24).toString('hex');
const classPassword = randomBytes(24).toString('hex');
const studentPassword = randomBytes(24).toString('hex');
const nickname = `QA-${Date.now()}`;
let passed = 0;
async function call(path, method='GET', body, token, expected=200) {
 const response = await fetch(`${base}${path}`, {method, headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(60000)});
 if(response.status!==expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}`);
 passed++; return response.status===204 ? null : response.json();
}
const teacher = await call('/auth/create','POST',{nickname,password,classPassword},undefined,201);
const student = await call('/auth/join','POST',{nickname:`${nickname}-student`,roomCode:teacher.roomCode,password:studentPassword,classPassword});
await call('/auth/join','POST',{nickname:`${nickname}-student`,roomCode:teacher.roomCode,password:'wrong-password'},undefined,401);
await call('/auth/join','POST',{nickname,roomCode:teacher.roomCode,password:classPassword},undefined,401);
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
const wsBase = process.env.TEST_WS_URL || base.replace(/^http/, 'ws');
const sockets = [];
function connect(token) {
 return new Promise((resolve, reject) => {
  const ws = new WebSocket(`${wsBase}/ws?token=${token}`, { origin: 'https://hivenotes-web.onrender.com', ...(process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {}) }); sockets.push(ws);
  const timer = setTimeout(() => reject(new Error('WebSocket connection timed out')), 20000);
  ws.once('open', () => { clearTimeout(timer); resolve(ws); });
  ws.once('error', () => { clearTimeout(timer); reject(new Error('WebSocket connection failed')); });
 });
}
function nextEvent(ws, event, predicate = () => true) {
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => { ws.off('message', listener); reject(new Error(`Realtime ${event} timed out`)); }, 15000);
  const listener = raw => { const message = JSON.parse(raw.toString()); if(message.event===event && predicate(message.data)){ clearTimeout(timer); ws.off('message', listener); resolve(message.data); } };
  ws.on('message', listener);
 });
}
try {
 const teacherWs = await connect(teacher.token);
 const studentWs = await connect(student.token);
 const createdPromise = nextEvent(teacherWs, 'note:created', n => n.content==='QA: realtime create');
 studentWs.send(JSON.stringify({event:'note:create', data:{pageIndex:student.pageIndex, content:'QA: realtime create', color:'sage', x:80, y:80}}));
 const realtimeNote = await createdPromise; passed++;
 const updatedPromise = nextEvent(teacherWs, 'note:updated', n => n.id===realtimeNote.id);
 studentWs.send(JSON.stringify({event:'note:update', data:{id:realtimeNote.id, content:'QA: realtime edit'}}));
 await updatedPromise; passed++;
 const realtimeRoom = await call(`/rooms/${teacher.roomCode}`, 'GET', undefined, student.token);
 if(!realtimeRoom.notes.some(n=>n.id===realtimeNote.id&&n.content==='QA: realtime edit')) throw new Error('Realtime note not persisted');
 await call(`/notes/${realtimeNote.id}`,'PATCH',{content:'Unauthorised edit'},teacher.token,403);
 await call(`/notes/${realtimeNote.id}`,'DELETE',undefined,student.token,204);
 await call('/auth/create','POST',{nickname:123,password:'invalid-input-test'},undefined,400);
} finally { for(const ws of sockets) ws.close(); }
console.log(`PASS: ${passed} classroom API/realtime checks; create/join/rejoin/save/edit/delete and room isolation. Disposable classroom code: ${teacher.roomCode}`);
