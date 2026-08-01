# Local Testing Guide

## Current Status

✅ **Backend Setup:**
- compression dependency installed
- Prisma client generated successfully
- Environment file (.env) created
- Code ready to run

⚠️ **Database Setup:**
- Need to set up PostgreSQL or use cloud database
- Two options available below

---

## Option 1: Quick Cloud Database (Easiest)

No local setup required. Use Supabase (free tier with PostgreSQL).

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up (free)
3. Create new project
4. Wait 2 minutes for creation
5. Go to Settings → Database
6. Copy connection string (Postgres)

### Step 2: Update .env

```bash
# In server/.env, replace DATABASE_URL with:
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### Step 3: Run Migrations

```bash
cd server
npx prisma migrate deploy
```

### Step 4: Start Backend

```bash
npm run dev
```

**Pros:** No local installation, instant setup, free tier available
**Cons:** Requires internet connection

---

## Option 2: Local PostgreSQL (Better for Development)

### Step 1: Install PostgreSQL

**Windows:**
```bash
# Using Chocolatey
choco install postgresql

# Or download from:
# https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database User

```bash
# Open PostgreSQL prompt
psql -U postgres

# Create user (if not exists)
CREATE USER hivenotes WITH ENCRYPTED PASSWORD 'password';

# Create database
CREATE DATABASE hivenotes OWNER hivenotes;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hivenotes TO hivenotes;

# Exit
\q
```

### Step 3: Update .env

```bash
# In server/.env:
DATABASE_URL="postgresql://hivenotes:password@localhost:5432/hivenotes"
```

### Step 4: Run Migrations

```bash
cd server
npx prisma migrate deploy
```

**Should see:**
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Applying migration(s): `20260801120000_add_page_operations`
Migration(s) created successfully and applied to the database.
```

### Step 5: Verify Database

```bash
psql -U hivenotes -h localhost -d hivenotes -c "\dt"
```

**Should see:**
```
                 List of relations
Schema |         Name         | Type  |  Owner
-------+----------------------+-------+---------
public | ActiveUser           | table | postgres
public | Note                 | table | postgres
public | Page                 | table | postgres
public | PageOperation        | table | postgres
public | Room                 | table | postgres
public | _prisma_migrations   | table | postgres
(6 rows)
```

---

## Once Database is Ready

### Backend

```bash
cd server
npm run dev
```

**Should see:**
```
🐝  HiveNotes server running
   HTTP  → http://localhost:4000
   Files → http://localhost:4000/files

[ws] WebSocket initialized
```

### Frontend (New Terminal)

```bash
cd web
npm run dev
```

**Should see:**
```
  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000
  - Environments: .env.local
```

### Open Application

Go to http://localhost:3000 in browser

---

## Testing Scenarios

### 1. Create a Room

```
1. Click "New Journal"
2. Enter name: "Test User"
3. Set password: "test123"
4. Click "Bind New Journal"
5. Should see empty journal
6. Copy the room code shown
```

### 2. Test Operational Transformation (OT)

```
BROWSER 1:
1. Open http://localhost:3000
2. Click "Open Journal"
3. Enter code from above
4. Enter name: "User A"
5. Password: "test123"
6. Click on Page 0
7. Start typing: "Hello"

BROWSER 2:
1. Same steps but name: "User B"
2. Click on Page 0
3. At same time as User A, type: "World"
4. Both should type simultaneously
5. Check result - both should see merged text
```

**Expected result**: Both users see text combined (order may vary, both see same final result)

### 3. Test Note Versioning

```
BROWSER 1:
1. Create a note: click on page
2. Type in note: "First edit"
3. Copy the version number from browser DevTools

BROWSER 2:
1. Create same note with same content
2. Modify it: "Second edit"
3. Save

BROWSER 1:
1. Try to save note with old version
2. Should get 409 Conflict error
3. Refresh
4. See latest content
```

**Expected result**: Conflict detected, user can refresh and retry

### 4. Test WebSocket Connection

```
Open both browsers
1. Browser 1 goes to Page 0
2. Browser 2 goes to Page 1
3. Browser 1 user types on Page 0
4. Browser 2 user SHOULD NOT see those updates (different page)
5. Browser 2 goes to Page 0
6. NOW sees the updates from Browser 1
```

**Expected result**: Only relevant page updates received

### 5. Test Rate Limiting

```bash
# Terminal - spam auth endpoint
for i in {1..10}; do
  curl -X POST http://localhost:4000/auth/create \
    -H "Content-Type: application/json" \
    -d '{"nickname":"test","password":"test"}' &
done
wait
```

**Expected result**: After 5 requests in 60 seconds, get 429 error

### 6. Test File Upload

```
1. Create a note
2. Try to upload a file (click media icon if available)
3. Check uploads folder: server/uploads/
4. File should be there with random name
5. Delete it manually (or wait 30 days for auto-cleanup)
```

**Expected result**: File uploaded, random filename, in uploads folder

### 7. Test Pagination

```bash
# Terminal - Create many notes
for i in {1..150}; do
  curl -X POST http://localhost:4000/notes \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <your-jwt-token>" \
    -d "{\"pageIndex\":0,\"content\":\"Note $i\",\"color\":\"amber\",\"x\":80,\"y\":80}"
done
```

**Expected result**: 
- First page load gets 100 notes
- Can scroll/pagination to get more
- No browser lag

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# If error, restart:
# macOS: brew services restart postgresql@15
# Linux: sudo systemctl restart postgresql
# Windows: services.msc → PostgreSQL → Start
```

### "Prisma migration fails"

```bash
# Check migration status
npx prisma migrate status

# Try again
npx prisma migrate deploy

# If stuck, resolve
npx prisma migrate resolve --rolled-back 20260801120000_add_page_operations
```

### "WebSocket not connecting"

1. Check backend is running (`curl http://localhost:4000/health`)
2. Check frontend env var: `NEXT_PUBLIC_WS_URL=ws://localhost:4000`
3. Check browser console for errors (F12 → Console)
4. Check backend logs for [ws] messages

### "Port already in use"

```bash
# Port 4000 in use
lsof -i :4000  # See what's using it
kill -9 <PID>  # Kill it

# Or use different port
PORT=5000 npm run dev
```

---

## Next Steps

After testing locally:

1. **Review code changes** - Read `FILES_CHANGED.md`
2. **Understand OT** - Read `server/src/lib/OT_EXPLANATION.md`
3. **Plan deployment** - Follow `DEPLOYMENT_CHECKLIST.md`
4. **Deploy to production** - Use your hosting platform

---

## Files Structure

```
hivenotes/
├── server/
│   ├── .env                      ← Update with DB credentials
│   ├── src/index.ts              ← Start here
│   ├── prisma/
│   │   ├── schema.prisma         ← Database schema
│   │   └── prisma.config.ts      ← Prisma config
│   └── uploads/                  ← File uploads go here
├── web/
│   ├── .env.local                ← Frontend config
│   └── src/
└── package.json
```

---

## Quick Start Summary

```bash
# 1. Set up database (choose Option 1 or 2 above)

# 2. Run migrations
cd server
npx prisma migrate deploy

# 3. Start backend
npm run dev

# 4. In new terminal, start frontend
cd web
npm run dev

# 5. Open http://localhost:3000
# 6. Test scenarios above
```

---

## Questions?

- **Database setup**: See PostgreSQL section above
- **Can't connect**: Run `psql -U postgres -h localhost -c "SELECT 1"`
- **Backend won't start**: Check `.env` file and DATABASE_URL
- **Prisma issues**: Run `npx prisma generate`
- **WebSocket issues**: Check browser DevTools Network tab (WS filter)
