# Shared Render Postgres deployment

Existing instance: waypoint-db, Oregon, PostgreSQL 18, 256 MB RAM / 1 GB disk.
Keep waypoint_dutk and its existing hivenotes schema unchanged. A live QA classroom was confirmed in hivenotes.Room on this instance; classroom HiveNotes is already connected. Create logical databases ronohs_decor and kifaru_erp on that instance. Database URLs differ only in their database path initially; provision separate app roles where permitted. Do not expose owner credentials to a browser.

## Required cutover
1. Export each existing application database with pg_dump and verify the export. Record row counts and current schema versions. This is a migration, not merely changing environment variables.
2. Use the existing instance owner's authenticated psql connection to create the two databases below. Render MCP read-only SQL cannot apply this file.
3. Restore each export into its matching database, then apply project migrations to that database only. Never apply Django and Prisma migrations to waypoint_dutk/public together.
4. Configure DATABASE_URL on each backend. Ronoh must also clear/update DATABASE_URL_BUILD: its current settings prioritize that variable over DATABASE_URL.
5. Existing backends are Frankfurt while the database is Oregon: use the external TLS URL for the immediate cutover, or migrate services to Oregon for internal networking. Never use an Oregon internal hostname from Frankfurt.
6. Validate login, row counts, shopping/inventory/classroom workflows before changing frontend traffic. Retain the old database and a rollback URL until validation completes.

## Migrations
- Ronoh: python manage.py migrate --noinput
- Kifaru: python manage.py migrate --noinput
- HiveNotes classroom: npm run db:migrate (from server)

HiveNotes uses the classroom-journal branch and currently shares waypoint_dutk through DATABASE_SCHEMA=hivenotes. Preserve both the URL schema parameter and runtime DATABASE_SCHEMA. Do not migrate it just to satisfy this consolidation task.

## Limits and unresolved dependencies
The instance reports max_connections=103 and 11 active connections at inspection; this is a ceiling, not a capacity promise. With 256 MB RAM, start the HiveNotes pool at 5 connections and Django with one worker per small app, then monitor memory/query latency. Storage is only 1 GB; media uploads belong in durable object storage or an attached persistent disk, with URLs in Postgres. HiveNotes currently stores uploads on ephemeral service storage; UPLOADS_DIR is now configurable but still needs durable hosting. Ronoh payment credentials/webhook, real email delivery, source database backups and Kifaru service resumption must be checked during deployment.

## Verification evidence
Ronoh: production frontend build; 11 isolated Django customer/payment tests.
Kifaru: 21 isolated Django tests including browser-facing page rendering and transactional POS pricing/validation.
HiveNotes: frontend/server production builds; 11 live API checks against disposable classrooms, repeated through the public website proxy after deployment; 9 isolated HTTP authentication tests with mocked persistence. New classes now require separate invitation and teacher private passwords. Existing classes retain their credentials and need an owner-led password rotation; do not change existing users automatically. Full browser, WebSocket, media restart durability and actual sandbox payment verification remain separate release gates.
