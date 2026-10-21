import { prisma } from "../../prisma";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  pageTitle: string;
  sourceId: string;
  similarity: number;
}

export async function vectorSearch(
  workspaceId: string,
  embedding: number[],
  limit = 20
) {
  const vectorString = `[${embedding.join(',')}]`;
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      kc.id,
      kc."documentId",
      kc.content,
      kc."chunkIndex",
      COALESCE(d.title, 'Untitled Document') AS "title",
      COALESCE(d.title, 'Untitled Document') AS "pageTitle",
      kc."documentId" AS "sourceId",
      1 - (
        kc.embedding <=> ${vectorString}::vector
      ) AS similarity
    FROM "KnowledgeChunk" kc
    JOIN "Document" d ON d.id = kc."documentId"
    JOIN "Space" s ON s.id = d."spaceId" AND s."workspaceId" = kc."workspaceId"
    JOIN "Workspace" w ON w.id = s."workspaceId"
    WHERE kc."workspaceId" = ${workspaceId}
      AND d."deletedAt" IS NULL AND s."deletedAt" IS NULL AND w."deletedAt" IS NULL
    ORDER BY kc.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;
}

export async function keywordSearch(
  workspaceId: string,
  query: string,
  limit = 20
) {
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      kc.id,
      kc."documentId",
      kc.content,
      kc."chunkIndex",
      COALESCE(d.title, 'Untitled Document') AS "title",
      COALESCE(d.title, 'Untitled Document') AS "pageTitle",
      kc."documentId" AS "sourceId",
      ts_rank(
        to_tsvector('english', kc.content),
        plainto_tsquery('english', ${query})
      ) AS similarity
    FROM "KnowledgeChunk" kc
    JOIN "Document" d ON d.id = kc."documentId"
    JOIN "Space" s ON s.id = d."spaceId" AND s."workspaceId" = kc."workspaceId"
    JOIN "Workspace" w ON w.id = s."workspaceId"
    WHERE
      kc."workspaceId" = ${workspaceId}
      AND d."deletedAt" IS NULL AND s."deletedAt" IS NULL AND w."deletedAt" IS NULL
      AND to_tsvector('english', kc.content)
          @@ plainto_tsquery('english', ${query})
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;
}

export function mergeAndRank<T extends { id: string }>(
  vectorResults: T[],
  keywordResults: T[]
) {
  const rrfScore = new Map<string, T & { score: number }>();

  // RRF constant (typically 60)
  const k = 60;

  vectorResults.forEach((result, index) => {
    const rank = index + 1;
    rrfScore.set(result.id, {
      ...result,
      score: 1 / (k + rank)
    });
  });

  keywordResults.forEach((result, index) => {
    const rank = index + 1;
    const existing = rrfScore.get(result.id);
    if (existing) {
      existing.score += 1 / (k + rank);
    } else {
      rrfScore.set(result.id, {
        ...result,
        score: 1 / (k + rank)
      });
    }
  });

  return Array.from(rrfScore.values())
    .sort((a, b) => b.score - a.score);
}
