import { prisma } from "../../prisma";

export async function vectorSearch(
  workspaceId: string,
  embedding: number[],
  limit = 20
) {
  const vectorString = `[${embedding.join(',')}]`;
  return prisma.$queryRaw<any[]>`
    SELECT
      kc.id,
      kc."pageId",
      kc."documentId",
      kc.content,
      kc."chunkIndex",
      COALESCE(d.title, p.title, 'Untitled Document') AS "title",
      COALESCE(d.title, p.title, 'Untitled Document') AS "pageTitle",
      COALESCE(kc."documentId", kc."pageId") AS "sourceId",
      1 - (
        kc.embedding <=> ${vectorString}::vector
      ) AS similarity
    FROM "KnowledgeChunk" kc
    LEFT JOIN "Document" d ON d.id = kc."documentId"
    LEFT JOIN "Page" p ON p.id = kc."pageId"
    WHERE kc."workspaceId" = ${workspaceId}
      AND (d."deletedAt" IS NULL OR d.id IS NULL)
      AND (p."deletedAt" IS NULL OR p.id IS NULL)
    ORDER BY kc.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;
}

export async function keywordSearch(
  workspaceId: string,
  query: string,
  limit = 20
) {
  return prisma.$queryRaw<any[]>`
    SELECT
      kc.id,
      kc."pageId",
      kc."documentId",
      kc.content,
      COALESCE(d.title, p.title, 'Untitled Document') AS "title",
      COALESCE(d.title, p.title, 'Untitled Document') AS "pageTitle",
      COALESCE(kc."documentId", kc."pageId") AS "sourceId",
      ts_rank(
        to_tsvector('english', kc.content),
        plainto_tsquery('english', ${query})
      ) AS similarity
    FROM "KnowledgeChunk" kc
    LEFT JOIN "Document" d ON d.id = kc."documentId"
    LEFT JOIN "Page" p ON p.id = kc."pageId"
    WHERE
      kc."workspaceId" = ${workspaceId}
      AND (d."deletedAt" IS NULL OR d.id IS NULL)
      AND (p."deletedAt" IS NULL OR p.id IS NULL)
      AND to_tsvector('english', kc.content)
          @@ plainto_tsquery('english', ${query})
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;
}

export function mergeAndRank(
  vectorResults: any[],
  keywordResults: any[]
) {
  const rrfScore = new Map<string, any>();

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
