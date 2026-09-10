-- Each nickname keeps its own book password so classmates cannot
-- open someone else's journal with the shared class password.
ALTER TABLE "ActiveUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
