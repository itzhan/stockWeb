-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnName" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColumnName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexData" (
    "id" SERIAL NOT NULL,
    "indexCode" TEXT NOT NULL,
    "indexName" TEXT NOT NULL,
    "source" TEXT,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "priceChangeRate" DOUBLE PRECISION,
    "etfLatestScales" DOUBLE PRECISION,
    "turnover" DOUBLE PRECISION,
    "etfNetPurRedeem" DOUBLE PRECISION,
    "etfNetPurRedeem1w" DOUBLE PRECISION,
    "etfNetPurRedeem1m" DOUBLE PRECISION,
    "chgRateD5" DOUBLE PRECISION,
    "chgRateM1" DOUBLE PRECISION,
    "chgRateYear" DOUBLE PRECISION,
    "peTtm" DOUBLE PRECISION,
    "peTtmPercentY3" DOUBLE PRECISION,
    "pb" DOUBLE PRECISION,
    "pbPercentY3" DOUBLE PRECISION,
    "dividendYieldRatio" DOUBLE PRECISION,
    "capitalFlowW8" JSONB,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnName_key_key" ON "ColumnName"("key");

-- CreateIndex
CREATE INDEX "IndexData_tradeDate_idx" ON "IndexData"("tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "IndexData_indexCode_tradeDate_key" ON "IndexData"("indexCode", "tradeDate");
