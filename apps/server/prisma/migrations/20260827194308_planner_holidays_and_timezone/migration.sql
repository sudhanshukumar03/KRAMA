/*
  Warnings:

  - You are about to drop the `PageEmbedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TimeBlockType" AS ENUM ('MEETING', 'PERSONAL', 'STUDY', 'WORK', 'HEALTH', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'STATE', 'REGIONAL', 'FESTIVAL', 'RELIGIOUS', 'OPTIONAL', 'OBSERVANCE', 'INTERNATIONAL', 'BANK', 'SCHOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('LOCAL_ONLY', 'SYNC_PENDING', 'SYNCED', 'SYNC_ERROR', 'CONFLICT');

-- DropForeignKey
ALTER TABLE "PageEmbedding" DROP CONSTRAINT "PageEmbedding_pageId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'IN',
ADD COLUMN     "regionCode" TEXT,
ADD COLUMN     "weeklyCapacityMinutes" INTEGER NOT NULL DEFAULT 2400;

-- DropTable
DROP TABLE "PageEmbedding";

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" vector(768),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" "TimeBlockType" NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "notes" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'LOCAL_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineOccurrence" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localName" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT,
    "type" "HolidayType" NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isPublicHoliday" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceId" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3),
    "remoteUpdatedAt" TIMESTAMP(3),
    "localUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_workspaceId_idx" ON "KnowledgeChunk"("workspaceId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_pageId_idx" ON "KnowledgeChunk"("pageId");

-- CreateIndex
CREATE INDEX "TimeBlock_userId_date_idx" ON "TimeBlock"("userId", "date");

-- CreateIndex
CREATE INDEX "RoutineOccurrence_userId_date_idx" ON "RoutineOccurrence"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineOccurrence_habitId_date_key" ON "RoutineOccurrence"("habitId", "date");

-- CreateIndex
CREATE INDEX "Milestone_userId_date_idx" ON "Milestone"("userId", "date");

-- CreateIndex
CREATE INDEX "Holiday_countryCode_regionCode_year_idx" ON "Holiday"("countryCode", "regionCode", "year");

-- CreateIndex
CREATE INDEX "Holiday_countryCode_regionCode_date_idx" ON "Holiday"("countryCode", "regionCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_countryCode_regionCode_date_name_key" ON "Holiday"("countryCode", "regionCode", "date", "name");

-- CreateIndex
CREATE INDEX "ExternalItem_userId_internalId_idx" ON "ExternalItem"("userId", "internalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalItem_provider_externalId_userId_key" ON "ExternalItem"("provider", "externalId", "userId");

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
