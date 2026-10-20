export type TextStreamProvider = (signal: AbortSignal) => Promise<AsyncIterable<string>>;

// Fall back only before delivering text. Switching providers mid-answer would
// splice two unrelated completions together and hide a partial-stream failure.
export async function* streamWithFallback(providers: TextStreamProvider[], signal: AbortSignal, timeoutMs = 30000) {
  let lastError: unknown = new Error('No AI text provider is configured.');
  for (const provider of providers) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal.aborted) throw new Error('AI request cancelled.');
      let emitted = false;
      const attemptController = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let cancelAttempt: () => void = () => {};
      const deadline = new Promise<never>((_resolve, reject) => {
        cancelAttempt = () => { reject(new Error('AI request cancelled.')); attemptController.abort(); };
        signal.addEventListener('abort', cancelAttempt, { once: true });
        timeout = setTimeout(() => {
          reject(Object.assign(new Error('AI provider timed out.'), { status: 504, code: 'AI_PROVIDER_TIMEOUT' }));
          attemptController.abort();
        }, timeoutMs);
      });
      try {
        const stream = await Promise.race([provider(attemptController.signal), deadline]);
        const iterator = stream[Symbol.asyncIterator]();
        while (true) {
          const chunk = await Promise.race([iterator.next(), deadline]);
          if (chunk.done) break;
          const text = chunk.value;
          if (signal.aborted) throw new Error('AI request cancelled.');
          if (text) { emitted = true; yield text; }
        }
        if (!emitted) throw new Error('AI provider returned no text.');
        return;
      } catch (error: any) {
        if (emitted || signal.aborted) throw error;
        lastError = error;
        const status = Number(error?.status || error?.code || error?.error?.code);
        // Retry temporary provider failures once, before any text has reached the client.
        // Permanent failures move directly to the next configured provider.
        if (attempt === 0 && error?.code !== 'AI_PROVIDER_TIMEOUT' && [429, 500, 502, 503, 504].includes(status)) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        break;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancelAttempt);
        attemptController.abort();
      }
    }
  }
  throw lastError;
}
