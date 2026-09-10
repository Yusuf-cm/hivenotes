/*
  Warnings:

  - You are about to alter the column `nickname` on the `ActiveUser` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `authorId` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(36)`.
  - You are about to alter the column `authorName` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `content` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - You are about to alter the column `color` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `mediaType` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `mediaUrl` on the `Note` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - You are about to alter the column `text` on the `Page` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10000)`.
  - Added the required column `updatedAt` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActiveUser" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nickname" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(36),
ALTER COLUMN "authorName" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "content" SET DATA TYPE VARCHAR(5000),
ALTER COLUMN "color" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "mediaType" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "mediaUrl" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "text" SET DATA TYPE VARCHAR(10000);

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PageOperation" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageOperation_pageId_version_idx" ON "PageOperation"("pageId", "version");

-- CreateIndex
CREATE INDEX "PageOperation_createdAt_idx" ON "PageOperation"("createdAt");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

-- CreateIndex
CREATE INDEX "Page_updatedAt_idx" ON "Page"("updatedAt");

-- CreateIndex
CREATE INDEX "Room_createdAt_idx" ON "Room"("createdAt");

-- AddForeignKey
ALTER TABLE "PageOperation" ADD CONSTRAINT "PageOperation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
