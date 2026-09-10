-- Shared class revision page + longer note transcripts

CREATE TABLE "ClassRevision" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Class revision',
  "body" TEXT NOT NULL DEFAULT '',
  "compiledBy" VARCHAR(50) NOT NULL,
  "compiledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassRevision_roomId_key" ON "ClassRevision"("roomId");

ALTER TABLE "ClassRevision"
  ADD CONSTRAINT "ClassRevision_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Note" ALTER COLUMN "content" TYPE TEXT;
