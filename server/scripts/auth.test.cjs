const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.DATABASE_URL = 'postgresql://unused@localhost:5432/unused';
const rooms = new Map(), users = new Map(), pages = new Map();
const prisma = {
 room: {
  findUnique: async ({where}) => rooms.get(where.code) || null,
  create: async ({data}) => { const room={id:randomUUID(),plan:'free',compileCount:0,...data}; rooms.set(room.code,room); return room; },
 },
 activeUser: {
  create: async ({data}) => { users.set(`${data.roomId}:${data.nickname}`, data); return data; },
  findUnique: async ({where}) => { const q=where.roomId_nickname; return users.get(`${q.roomId}:${q.nickname}`)||null; },
 },
 page: {
  findFirst: async ({where}) => pages.get(`${where.roomId}:${where.ownerUserId}`)||null,
  create: async ({data}) => { const p={id:randomUUID(),...data}; pages.set(`${data.roomId}:${data.ownerUserId}`,p); return p; },
 },
};
const prismaPath = require.resolve('../dist/lib/prisma');
require.cache[prismaPath] = { id:prismaPath, filename:prismaPath, loaded:true, exports:{prisma} };
const auth = require('../dist/routes/auth').default;

test('classroom HTTP authentication protects private teacher credentials', async t => {
 const app=express(); app.use(express.json()); app.use('/auth',auth);
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=async (path,body) => {const r=await fetch(`${base}/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try {
  const privatePassword=randomBytes(24).toString('hex'), invitation=randomBytes(24).toString('hex');
  const created=await post('create',{nickname:'Teacher QA',password:privatePassword,classPassword:invitation});
  assert.equal(created.status,201);
  const room=rooms.get(created.body.roomCode), teacher=users.get(`${room.id}:Teacher QA`);
  await t.test('separate password hashes are persisted',async()=>{
   assert.equal(await bcrypt.compare(invitation,room.passwordHash),true);
   assert.equal(await bcrypt.compare(privatePassword,teacher.passwordHash),true);
   assert.equal(await bcrypt.compare(invitation,teacher.passwordHash),false);
  });
  await t.test('invitation cannot log in as teacher',async()=>{assert.equal((await post('join',{nickname:'Teacher QA',roomCode:room.code,password:invitation})).status,401);});
  await t.test('teacher returns using private password',async()=>{const r=await post('join',{nickname:'Teacher QA',roomCode:room.code,password:privatePassword});assert.equal(r.status,200);assert.equal(r.body.userId,teacher.id);});
  await t.test('student joins with invitation and own password',async()=>{assert.equal((await post('join',{nickname:'Student QA',roomCode:room.code,password:'Student-private-42',classPassword:invitation})).status,200);});
  await t.test('equal teacher and invitation passwords rejected',async()=>{assert.equal((await post('create',{nickname:'Unsafe',password:'shared-password',classPassword:'shared-password'})).status,400);});
  await t.test('missing invitation rejected',async()=>{assert.equal((await post('create',{nickname:'Missing',password:privatePassword})).status,400);});
  await t.test('malformed input is a validation error',async()=>{assert.equal((await post('create',{nickname:123,password:privatePassword,classPassword:invitation})).status,400);});
  await t.test('bcrypt truncation boundary rejected',async()=>{assert.equal((await post('create',{nickname:'Too long',password:'x'.repeat(73),classPassword:invitation})).status,400);});
 } finally {await new Promise(resolve=>server.close(resolve));}
});
