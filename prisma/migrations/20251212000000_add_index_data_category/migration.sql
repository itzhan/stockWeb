-- Add category to distinguish industry vs theme
ALTER TABLE "IndexData" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'industry';

-- Replace unique index (indexCode, tradeDate) with (indexCode, tradeDate, category)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'IndexData'
      AND indexname = 'IndexData_indexCode_tradeDate_key'
  ) THEN
    EXECUTE 'DROP INDEX "IndexData_indexCode_tradeDate_key"';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "IndexData_indexCode_tradeDate_category_key"
  ON "IndexData" ("indexCode", "tradeDate", "category");

CREATE INDEX IF NOT EXISTS "IndexData_category_tradeDate_idx"
  ON "IndexData" ("category", "tradeDate");
