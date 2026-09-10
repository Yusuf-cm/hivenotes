-- Each student keeps an independent page index (their own book).
-- Notes belong to a page inside that book via pageOwnerId.

ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pageOwnerId" VARCHAR(36);

ALTER TABLE "Page" DROP CONSTRAINT IF EXISTS "Page_roomId_pageIndex_key";
DROP INDEX IF EXISTS "Page_roomId_pageIndex_key";

-- Give leftover unowned pages to the first member in the room.
UPDATE "Page" p
SET "ownerUserId" = (
  SELECT u.id FROM "ActiveUser" u
  WHERE u."roomId" = p."roomId"
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE p."ownerUserId" IS NULL;

-- Attach notes to the page they currently sit on, then renumber each book from 0.
WITH ranked AS (
  SELECT
    id,
    "roomId",
    "ownerUserId",
    "pageIndex" AS old_idx,
    ROW_NUMBER() OVER (
      PARTITION BY "roomId", "ownerUserId"
      ORDER BY "pageIndex" ASC
    ) - 1 AS new_idx
  FROM "Page"
)
UPDATE "Note" n
SET
  "pageOwnerId" = r."ownerUserId",
  "pageIndex" = r.new_idx
FROM ranked r
WHERE n."roomId" = r."roomId"
  AND n."pageIndex" = r.old_idx
  AND (n."pageOwnerId" IS NULL OR n."pageOwnerId" = r."ownerUserId");

UPDATE "Page" p
SET "pageIndex" = r.new_idx
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "roomId", "ownerUserId"
      ORDER BY "pageIndex" ASC
    ) - 1 AS new_idx
  FROM "Page"
) r
WHERE p.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS "Page_roomId_ownerUserId_pageIndex_key"
  ON "Page"("roomId", "ownerUserId", "pageIndex");

CREATE INDEX IF NOT EXISTS "Note_roomId_pageOwnerId_pageIndex_idx"
  ON "Note"("roomId", "pageOwnerId", "pageIndex");
