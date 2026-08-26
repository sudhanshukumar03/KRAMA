import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });

  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
