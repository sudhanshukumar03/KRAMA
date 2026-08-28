import { GoogleGenAI } from '@google/genai';
let client: GoogleGenAI | null = null;
export async function getEmbedding(text: string): Promise<number[]> {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  const result = await client.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  return result.embeddings[0].values;
}