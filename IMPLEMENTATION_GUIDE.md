# HiveNotes Implementation Guide

Complete reference for all features, optimizations, and architectural decisions.

## Table of Contents

1. [Conflict Resolution](#conflict-resolution)
2. [Performance Optimizations](#performance-optimizations)
3. [Security Features](#security-features)
4. [Database Design](#database-design)
5. [WebSocket Protocol](#websocket-protocol)
6. [Setup & Deployment](#setup--deployment)

---

## Conflict Resolution

### Page Editing: Operational Transformation (OT)

**What it is**: Algorithm that merges concurrent edits without losing data (like Google Docs).

**How it works**:
- Each character edit is an operation: `{type: 'insert'|'delete', index, content, version}`
- When two users edit simultaneously, server transforms them against each other
- Ensures both users end up with same text, regardless of operation order

**Example**:
```
User A: Insert "World" at pos 5        [version 0→1]
User B: Insert "!" at pos 5             [version 0→1]

After transformation & merge: "World!" or "!World"
(Deterministic via userId tiebreaker)
```

**Implementation**:
- `server/src/lib/ot.ts` - Core transformation algorithm
- `server/src/ws/handlers.ts` - `page:edit` event handler
- `web/src/lib/ot.ts` - Client-side OT state management
- `web/src/hooks/useOTPages.ts` - React hook for collaborative editing
- Database: `Page` + `PageOperation` tables track all edits

**WebSocket Events**:
- Client sends: `page:edit { pageIndex, type, index, content, version }`
- Server broadcasts: `page:edited { pageIndex, operation, version, userId }`

### Note Editing: Optimistic Locking

**What it is**: Simple version checking to prevent lost updates on sticky notes.

**How it works**:
- Each note has a `version` number (1, 2, 3...)
- Client sends version with update: `PATCH /notes/:id { content, version: 5 }`
- Server rejects if current version ≠ 5 (returns 409 Conflict)
- Client gets error, refreshes data, retries

**UX**:
- Most updates succeed silently (no conflict)
- If conflict occurs: "This note was modified. Refresh to see latest." → User refreshes → Retries
- Prevents silent data loss when two people edit same note

**Implementation**:
- `server/src/routes/notes.ts` - Version check on PATCH
- `server/prisma/schema.prisma` - `Note.version` field
- Database enforces atomic increment: `version = version + 1`

---

## Performance Optimizations

### 1. Pagination

**Problem**: Loading 10,000 notes into memory crashes browser/server.

**Solution**: Fetch notes in pages of 100.

**Endpoints**:
- `GET /rooms/:code?page=0` - Returns 100 notes + metadata
- `GET /rooms/:code/notes?page=0` - Just notes
- `GET /notes/page/:pageIndex` - All notes on specific page

**Frontend**: Use `useOTPages` hook to load pages as user views them.

### 2. WebSocket Broadcast Optimization

**Problem**: Broadcasting every note edit to entire room (even users not viewing that page).

**Solution**: Track `currentPage` per user, only send updates to relevant users.

**Implementation**:
- Client sends `page:view { pageIndex }` when switching pages
- Server maintains `Client.currentPage` field
- `broadcastByPage(roomCode, pageIndex, ...)` only sends to users on that page
- Reduces messages by ~80% in multi-page rooms

### 3. In-Memory Caching

**Problem**: Querying note count every page load (DB hit).

**Solution**: Cache results with TTL (Time To Live).

**What's cached**:
- Room note counts (2-minute TTL)
- Auto-invalidates on note create/delete

**Implementation**: `server/src/lib/cache.ts`

```typescript
cache.set('room:abc123:noteCount', 1234, 2 * 60 * 1000)
const count = cache.get('room:abc123:noteCount')  // Returns 1234
cache.invalidate('room:abc123')  // Clears all room:abc123:* keys
```

### 4. File Cleanup

**Problem**: Old uploads accumulate (disk usage grows unbounded).

**Solution**: Auto-delete files older than 30 days.

**How it works**:
- Runs on server startup
- Then daily via `setInterval`
- Checks file modification time, deletes if > 30 days old
- Logs deletion count

**Implementation**: `server/src/lib/fileCleanup.ts`

### 5. Storage Quotas

**Problem**: One malicious room could consume all server storage.

**Solution**: 100MB limit per room.

**Behavior**:
- Upload checks total room usage before accepting file
- Returns 413 error if over quota
- Shows user: "Storage limit reached (used X / 100MB)"

**Implementation**: `server/src/routes/upload.ts`

### 6. Database Optimization

**Indexes** (faster queries):
- `Note(roomId, pageIndex)` - For page-specific note queries
- `Note(createdAt)` - For sorting by creation time
- `Page(roomId, pageIndex)` - Unique constraint + query
- `PageOperation(pageId, version)` - OT operation history

**Connection Pooling**:
- Added `directUrl` to Prisma config for better pooling with PgBouncer
- Prevents connection exhaustion on high concurrency

**Constraints** (data integrity):
- `authorName VARCHAR(50)` - Max length enforced at DB
- `content VARCHAR(5000)` - Max length enforced at DB
- `Page.text VARCHAR(10000)` - Max length enforced at DB

### 7. Compression

**What it does**: Compresses all responses (gzip).

**Configuration**:
- Compression level 6 (good balance of speed/ratio)
- Only compresses responses > 1KB (saves CPU)

**Typical savings**: 60-80% reduction on JSON responses.

**Implementation**: Express `compression` middleware in `server/src/index.ts`

### 8. Slow Query Logging

**What it does**: Logs requests that take > 1 second.

**Usage**: Helps identify bottlenecks in production.

```
[slow] GET /rooms/ABC123 - 1240ms
```

---

## Security Features

### 1. Cryptographic Random Generation

**Problem**: `Math.random()` is predictable.

**Solution**: Use `crypto.randomBytes()` for:
- Room codes (instead of Math.random())
- File names on upload (instead of Math.random())
- Temp note IDs on frontend

### 2. Input Validation

**All inputs validated**:
- Length limits: content≤5000, nickname≤50, pageText≤10000
- Type validation: colors must be in [amber, sage, sky, blush, violet, peach]
- Number validation: coordinates must be finite numbers
- Array validation: checkboxes must be array

**Two layers**:
- Application layer (routes/handlers)
- Database layer (VARCHAR constraints)

### 3. Rate Limiting

**Aggressive on sensitive endpoints**:
- `/auth` - 5 requests per minute per IP (prevents brute force)
- `/upload` - 20 requests per 15 minutes per IP
- Other endpoints - 100-200 per 15 minutes

**Implementation**: `server/src/middleware/rateLimit.ts`

### 4. Security Headers

**CORS**: Strict whitelist
- `http://localhost:3000` (dev)
- `https://hivenotes.vercel.app` (prod)
- `https://hivenotes-[a-z0-9-]+.vercel.app` (preview deploys only)

**HTTP Headers**:
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enable XSS protection
- `Content-Security-Policy` - Restrict script/style/image sources
- `Cache-Control` on sensitive endpoints - Prevent caching

**Implementation**: `server/src/middleware/securityHeaders.ts`

### 5. Optimistic Locking (Note Versioning)

Prevents lost updates via race conditions.

### 6. File Upload Security

- Whitelist MIME types (image/*, audio/*)
- Whitelist file extensions (.jpg, .png, .webm, etc.)
- Prevent path traversal attacks
- Validate actual file content, not just extension
- Max file size: 20MB
- Max 1 file per request

---

## Database Design

### Schema

```sql
Room
├── id (UUID, primary key)
├── code (String, unique, 6-char secure random)
├── passwordHash (bcryptjs)
├── createdAt, updatedAt
└── Relations: pages[], notes[], users[]

ActiveUser
├── id (UUID)
├── nickname (VARCHAR(50))
├── roomId (FK)
├── createdAt
└── Auto-removed after 15 min inactivity

Page
├── id (UUID)
├── roomId (FK)
├── pageIndex (0, 1, 2, ...)
├── text (VARCHAR(10000))
├── version (Int)
├── updatedAt
└── Operations: (see PageOperation)

PageOperation
├── id (UUID)
├── pageId (FK)
├── version (1, 2, 3, ...)
├── type ('insert' | 'delete')
├── index (position in text)
├── content (VARCHAR(5000))
├── userId
├── createdAt

Note
├── id (UUID)
├── roomId (FK)
├── pageIndex (which page it's on)
├── authorId, authorName
├── content (VARCHAR(5000))
├── color (amber|sage|sky|blush|violet|peach)
├── x, y (position), zIndex (layering)
├── mediaType (none|image|audio)
├── mediaUrl
├── checkboxes (JSON)
├── version (1, 2, 3, ... for optimistic locking)
├── createdAt, updatedAt
```

### Indexes

- `Page(roomId, pageIndex)` - Unique + query
- `Page(updatedAt)` - Recent pages
- `Note(roomId, pageIndex)` - Notes on page
- `Note(createdAt)` - Recent notes
- `PageOperation(pageId, version)` - OT history
- `ActiveUser(roomId)` - Users in room

---

## WebSocket Protocol

### Client → Server Events

**Authentication**:
- Connect with: `ws://server/ws?token=<JWT>`
- JWT contains: userId, nickname, roomId, roomCode

**Page Editing**:
```typescript
// Collaborative text editing (OT)
{
  event: 'page:edit',
  data: {
    pageIndex: 0,
    type: 'insert' | 'delete',
    index: 42,           // Position in text
    content: 'text',     // Text to insert/delete
    version: 5           // Client's current version
  }
}

// Presence tracking
{
  event: 'page:view',
  data: { pageIndex: 0 }
}
```

**Note Operations**:
```typescript
{
  event: 'note:create',
  data: { pageIndex, content, color, x, y, ... }
}

{
  event: 'note:update',
  data: { id, content, color, x, y, version, ... }
}

{
  event: 'note:delete',
  data: { id }
}
```

### Server → Client Events

**Page Editing**:
```typescript
{
  event: 'page:edited',
  data: {
    pageIndex: 0,
    operation: { type, index, content },
    version: 6,
    userId: 'user-id'
  }
}
```

**Presence**:
```typescript
{
  event: 'room:presence',
  data: {
    count: 3,
    users: [{ userId, nickname }, ...]
  }
}

{
  event: 'user:joined',
  data: { userId, nickname }
}

{
  event: 'user:left',
  data: { userId, nickname }
}
```

---

## Setup & Deployment

### Prerequisites

```bash
# Install compression support
cd server
npm install compression

# Generate Prisma migration for OT
npx prisma migrate dev --name add_page_operations

# Apply migrations
npm run db:migrate
```

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host/db
DATABASE_DIRECT_URL=postgresql://user:pass@host/db  # For connection pooling
JWT_SECRET=<generate secure random>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### Run

```bash
# Backend
cd server
npm run dev

# Frontend
cd web
npm run dev
```

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Use `DATABASE_URL` with connection pooling (PgBouncer)
- [ ] Use `DATABASE_DIRECT_URL` for migrations only
- [ ] Enable HTTPS (security headers assume HTTPS in prod)
- [ ] Set correct CORS origins (not localhost)
- [ ] Configure file upload limit per room (100MB default)
- [ ] Set up log aggregation (slow queries, errors)
- [ ] Monitor WebSocket connections
- [ ] Set up backup for PostgreSQL
- [ ] Enable WAL archiving for point-in-time recovery

### Monitoring

**Key metrics**:
- WebSocket connection count
- Request latency (slow query logs)
- Database connection pool usage
- Disk usage (file cleanup status)
- Error rate by endpoint

**Health check**:
```bash
curl http://localhost:4000/health
# {
#   "status": "ok",
#   "timestamp": "2026-08-01T...",
#   "uptime": 3600
# }
```

---

## FAQ

**Q: Why OT for pages but not notes?**
A: Pages are frequently edited by multiple users (collaborative document). Notes are typically single-author (sticky notes). OT is complex; versioning is simpler for notes.

**Q: What happens if a client's version gets out of sync?**
A: They'll get a 409 Conflict error on note updates. Frontend should handle by refreshing data.

**Q: Can I disable OT for pages?**
A: You can revert to simple last-write-wins by removing the OT handlers and using simple text updates. Not recommended for collaboration.

**Q: How is the room code generated securely?**
A: Uses `crypto.randomBytes(3).toString('hex')` = 6 random hex chars = 2^24 combinations ≈ 16 million. With 1 collision check per room creation, effectively secure.

**Q: What if the database is slow?**
A: 
1. Check indexes (run `ANALYZE` on PostgreSQL)
2. Check slow query logs
3. Increase cache TTL
4. Enable connection pooling if not already done

**Q: How much can storage grow?**
A: Max 100MB per room. With typical 5MB per file, that's ~20 files per room. Adjust `ROOM_STORAGE_QUOTA` in `upload.ts` if needed.

---

## References

- [OT Explanation](server/src/lib/OT_EXPLANATION.md)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
