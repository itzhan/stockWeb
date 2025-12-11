-- Add membership columns to User
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
ADD COLUMN IF NOT EXISTS "passwordSalt" TEXT,
ADD COLUMN IF NOT EXISTS "membershipExpiresAt" TIMESTAMP(3);

-- Create ActivationCode table
CREATE TABLE IF NOT EXISTS "ActivationCode" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "durationDays" INTEGER NOT NULL,
    "note" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedById" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key to User
ALTER TABLE "ActivationCode"
ADD CONSTRAINT "ActivationCode_usedById_fkey"
FOREIGN KEY ("usedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
