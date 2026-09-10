# Deployment Checklist

## Before You Deploy

### Step 1: Install Missing Dependency

```bash
cd server
npm install compression
```

The compression middleware was added to improve performance. Without it, the server won't start.

### Step 2: Generate Database Migration

The schema was updated with new `PageOperation` table for Operational Transformation.

```bash
# In server directory
npx prisma migrate dev --name add_page_operations
```

This creates a migration file. If deploying to production:

```bash
npx prisma migrate deploy
```

### Step 3: Verify Security

- [ ] Check `server/src/middleware/securityHeaders.ts` is applied (already added to index.ts)
- [ ] Verify CORS origins in `src/index.ts` match your domain
- [ ] Ensure `JWT_SECRET` environment variable is set
- [ ] Check rate limits are appropriate for your scale (in `src/index.ts`)

### Step 4: Frontend Updates

The frontend types were updated to support OT:

```typescript
// New types in web/src/types/index.ts
interface OTOperation { type: 'insert' | 'delete', index, content }
```

The socket client was enhanced with:
- Better reconnection with exponential backoff
- Message queuing when disconnected
- Request ID tracking

No additional dependencies needed for frontend.

### Step 5: Environment Variables

Set these in your production environment:

```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/hivenotes
DATABASE_DIRECT_URL=postgresql://user:pass@host:5432/hivenotes
JWT_SECRET=<use: openssl rand -base64 32>
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

**IMPORTANT**: `DATABASE_DIRECT_URL` should NOT use connection pooling (PgBouncer). It's used for migrations only. Regular queries use `DATABASE_URL` with pooling.

### Step 6: Database Backups

Before deploying:

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup.sql

# Or with production URL
pg_dump postgres://user:pass@prod-db:5432/hivenotes > backup.sql
```

Keep this backup for 7+ days in case you need to rollback.

### Step 7: Test Locally First

```bash
# Install compression
npm install compression

# Run migrations
npx prisma migrate dev --name add_page_operations

# Start backend
npm run dev

# In another terminal, start frontend
cd ../web
npm run dev

# Test:
# 1. Open http://localhost:3000
# 2. Create a room
# 3. Open same room in 2 browsers
# 4. Edit page text in both - should merge correctly
# 5. Move a note in one browser - other should see it
# 6. Try uploading a file
```

---

## Deployment Steps (Railway/Vercel/Other)

### Backend Deployment

1. **Push code with schema migration**:
   ```bash
   git add -A
   git commit -m "Add operational transformation and optimizations"
   git push origin main
   ```

2. **Update environment variables** in your hosting dashboard:
   - Add/update: `DATABASE_URL`, `DATABASE_DIRECT_URL`, `JWT_SECRET`
   - Keep existing: `CORS_ORIGIN`, `NODE_ENV`

3. **Run migrations** (automatic with some platforms, or manually):
   ```bash
   npx prisma migrate deploy
   ```

4. **Verify health check**:
   ```bash
   curl https://api.yourdomain.com/health
   # Should return: {"status":"ok","timestamp":"...","uptime":...}
   ```

### Frontend Deployment

1. **Update environment variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
   ```

2. **Deploy**:
   ```bash
   git push origin main
   ```

3. **Verify**:
   - Open https://yourdomain.com
   - Create a room, verify WebSocket connects (check browser DevTools)

---

## Post-Deployment Verification

### Test Operational Transformation

```
1. Open same room in 2 tabs
2. Both users click on same page
3. User A types "Hello"
4. User B types "World" at the same time
5. Both should see merged text (order may vary but both see same result)
```

### Test Note Versioning

```
1. Create a note
2. Edit it in 2 browsers with staggered timing
3. First edit should succeed (no version conflict)
4. Second edit might fail with 409 if timing is tight
5. Refresh and retry should work
```

### Monitor Logs

```bash
# Watch for errors
tail -f logs/server.log | grep -i error

# Watch for slow queries
tail -f logs/server.log | grep slow

# Watch for cleanup tasks
tail -f logs/server.log | grep cleanup
```

---

## Rollback Plan

If deployment goes wrong:

### Quick Rollback (Last 10 minutes)

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Will rebuild/redeploy on most platforms
```

### Full Rollback (Database)

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

### If Migration Failed

```bash
# Revert migration
npx prisma migrate resolve --rolled-back add_page_operations

# Or manually:
npx prisma db execute --file rollback.sql
```

---

## Performance Monitoring

### Key Metrics to Watch

1. **WebSocket connections** - Should grow with users, drop when idle
2. **Request latency** - Watch for [slow] logs in output
3. **Database connections** - Check pool usage (should be < max pool size)
4. **Disk usage** - Monitor file cleanup is working
5. **Error rate** - Any sudden increase?

### Example Monitoring Commands

```bash
# Check current WebSocket connections
curl https://api.yourdomain.com/health

# Check recent errors (if using ELK/CloudWatch)
logs --filter "ERROR" --last 1h

# Check disk usage
du -sh uploads/

# Check database size
SELECT pg_size_pretty(pg_database_size('hivenotes'));
```

### Set Up Alerts

Alert on:
- Error rate > 1%
- Request latency > 5s
- Database connections > 80 of max pool
- Disk usage > 80GB
- WebSocket disconnect rate > 10%

---

## Ongoing Maintenance

### Daily

- [ ] Monitor error logs
- [ ] Check disk usage
- [ ] Verify health check is returning 200

### Weekly

- [ ] Review slow query logs
- [ ] Check file cleanup is running
- [ ] Test backup restoration process

### Monthly

- [ ] Update dependencies: `npm update`
- [ ] Review database indexes: `EXPLAIN` on slow queries
- [ ] Rotate logs (if not auto-rotating)
- [ ] Test disaster recovery

### Quarterly

- [ ] Security audit (dependencies, CVEs)
- [ ] Load testing
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Review and adjust rate limits if needed

---

## Troubleshooting

### "Migration failed"

```bash
# Check migration status
npx prisma migrate status

# View migration logs
cat prisma/migrations/TIMESTAMP_add_page_operations/migration.sql

# If stuck, mark as resolved and try again
npx prisma migrate resolve --rolled-back add_page_operations
```

### "WebSocket connection refused"

Check:
1. Backend is running (`curl /health`)
2. Correct WebSocket URL in frontend env vars
3. CORS allows WebSocket origin
4. Firewall isn't blocking port

### "Slow OT operations"

If page editing lags:
1. Check database indexes: `CREATE INDEX IF NOT EXISTS ...`
2. Check cache is working: monitor cache hit rate
3. Reduce pagination size if needed

### "Storage quota errors"

```bash
# Check total uploads size
du -sh uploads/

# See which files are largest
find uploads/ -type f -exec ls -lh {} \; | sort -k5 -h

# Manual cleanup (be careful!)
find uploads/ -mtime +30 -delete  # Older than 30 days
```

---

## New Features Added

### Backend
- ✅ Operational Transformation (OT) for pages
- ✅ Note versioning with optimistic locking
- ✅ Pagination API endpoints
- ✅ WebSocket broadcast filtering by page
- ✅ In-memory caching with TTL
- ✅ Automatic file cleanup (30 days)
- ✅ Storage quotas per room (100MB)
- ✅ Database connection pooling config
- ✅ Security headers middleware
- ✅ Rate limiting
- ✅ Request ID tracking
- ✅ Graceful shutdown
- ✅ Slow query logging
- ✅ Idle user cleanup

### Frontend
- ✅ OT client library
- ✅ `useOTPages` hook for collaborative editing
- ✅ Better socket reconnection with exponential backoff
- ✅ Message queuing when disconnected
- ✅ Debounce/throttle utilities
- ✅ Request IDs for debugging

---

## What's NOT Changed

These should still work as before:
- Authentication flow (JWT, create/join room)
- REST API for notes (now with versioning check)
- WebSocket presence tracking
- File uploads (now with quota)
- Sticky notes UI
- Page/room creation and deletion

---

## Questions?

Refer to:
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Full technical reference
- [server/src/lib/OT_EXPLANATION.md](server/src/lib/OT_EXPLANATION.md) - How OT works
- Database schema in [server/prisma/schema.prisma](server/prisma/schema.prisma)
