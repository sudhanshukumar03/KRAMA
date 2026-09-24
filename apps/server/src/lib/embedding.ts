import { getGeminiClient } from '../services/ai.service';

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const result = await client.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  const values = (result as any).embedding?.values || (result as any).embeddings?.[0]?.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini API returned empty embedding vector');
  }
  return values;
}