-- 补齐 Report.testId（与 prisma/schema.prisma 一致）；可在生产库重复执行。
-- 用法（与 Next 共用同一 DATABASE_URL）：
--   cd apps/web && npx prisma db execute --file ../../prisma/sql/add_report_test_id.sql --config prisma.config.ts

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "testId" TEXT;

CREATE INDEX IF NOT EXISTS "Report_testId_idx" ON "Report"("testId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TestTemplate'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_testId_fkey'
  ) THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "TestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
