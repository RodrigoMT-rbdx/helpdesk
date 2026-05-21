-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'agent');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'agent';

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
