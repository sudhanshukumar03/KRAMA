export type TextStreamProvider = (signal: AbortSignal) => Promise<AsyncIterable<string>>;

// Fall back only before delivering text. Switching providers mid-answer would
// splice two unrelated completions together and hide a partial-stream failure.
export async function* streamWithFallback(providers: TextStreamProvider[], signal: AbortSignal) {
  let lastError: unknown = new Error('No AI text provider is configured.');
  for (const provider of providers) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal.aborted) throw new Error('AI request cancelled.');
      let emitted = false;
      try {
        const stream = await provider(signal);
        for await (const text of stream) {
          if (signal.aborted) throw new Error('AI request cancelled.');
          if (text) { emitted = true; yield text; }
        }
        if (!emitted) throw new Error('AI provider returned no text.');
        return;
      } catch (error: any) {
        if (emitted || signal.aborted) throw error;
        lastError = error;
        const status = Number(error?.status || error?.code || error?.error?.code);
        if (attempt === 0 && [429, 500, 502, 503, 504].includes(status)) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
