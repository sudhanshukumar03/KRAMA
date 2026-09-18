import { getGeminiClient } from '../services/ai.service';

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const result = await client.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  return result.embeddings?.[0]?.values ?? [];
}