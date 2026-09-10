-- Deduplicate members so (roomId, nickname) can be unique. Keep the oldest row.
DELETE FROM "ActiveUser" a
USING "ActiveUser" b
WHERE a."roomId" = b."roomId"
  AND a.nickname = b.nickname
  AND a.id > b.id;

-- CreateIndex
CREATE UNIQUE INDEX "ActiveUser_roomId_nickname_key" ON "ActiveUser"("roomId", "nickname");

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "ownerUserId" VARCHAR(36),
ADD COLUMN "ownerName" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Page_roomId_ownerUserId_idx" ON "Page"("roomId", "ownerUserId");
