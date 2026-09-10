-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveUser" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "ActiveUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'amber',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "zIndex" INTEGER NOT NULL DEFAULT 1,
    "mediaType" TEXT NOT NULL DEFAULT 'none',
    "mediaUrl" TEXT,
    "checkboxes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "ActiveUser_roomId_idx" ON "ActiveUser"("roomId");

-- CreateIndex
CREATE INDEX "Page_roomId_idx" ON "Page"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_roomId_pageIndex_key" ON "Page"("roomId", "pageIndex");

-- CreateIndex
CREATE INDEX "Note_roomId_pageIndex_idx" ON "Note"("roomId", "pageIndex");

-- AddForeignKey
ALTER TABLE "ActiveUser" ADD CONSTRAINT "ActiveUser_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
