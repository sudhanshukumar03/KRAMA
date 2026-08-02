-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "PageEmbedding" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageEmbedding_pageId_key" ON "PageEmbedding"("pageId");

-- AddForeignKey
ALTER TABLE "PageEmbedding" ADD CONSTRAINT "PageEmbedding_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
