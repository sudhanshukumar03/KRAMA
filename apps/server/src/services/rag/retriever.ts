import { prisma } from "../../prisma";

export async function vectorSearch(
  workspaceId: string,
  embedding: number[],
  limit = 20
) {
  const vectorString = `[${embedding.join(',')}]`;
  return prisma.$queryRaw<any[]>`
    SELECT
      id,
      "pageId",
      content,
      "chunkIndex",
      1 - (
        embedding <=> ${vectorString}::vector
      ) AS similarity
    FROM "KnowledgeChunk"
    WHERE "workspaceId" = ${workspaceId}
    ORDER BY embedding <=> ${vectorString}::vector
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
      id,
      "pageId",
      content,
      ts_rank(
        to_tsvector('english', content),
        plainto_tsquery('english', ${query})
      ) AS similarity
    FROM "KnowledgeChunk"
    WHERE
      "workspaceId" = ${workspaceId}
      AND to_tsvector('english', content)
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
      score: 1 / (k + rank),
      source: 'vector'
    });
  });

  keywordResults.forEach((result, index) => {
    const rank = index + 1;
    if (rrfScore.has(result.id)) {
      const existing = rrfScore.get(result.id);
      existing.score += 1 / (k + rank);
      existing.source = 'hybrid';
    } else {
      rrfScore.set(result.id, {
        ...result,
        score: 1 / (k + rank),
        source: 'keyword'
      });
    }
  });

  const sortedCandidates = Array.from(rrfScore.values()).sort(
    (a, b) => b.score - a.score
  );

  return sortedCandidates;
}
