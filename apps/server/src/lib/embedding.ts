let pipeline: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!pipeline) {
    console.log(`[Embedding] Loading Xenova/all-MiniLM-L6-v2 (lazy load)...`);
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    pipeline = await transformersPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log(`[Embedding] Model loaded successfully.`);
  }
  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
