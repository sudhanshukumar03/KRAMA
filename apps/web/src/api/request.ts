/** JSON domain adapters share the authenticated transport supplied by client.ts. */
export type JsonRequest = <T>(endpoint: string, options?: RequestInit) => Promise<T>;

/** Authenticated transfers are supplied by the same session owner as JSON requests. */
export type DocumentDownload = (id: string, format: 'md' | 'spec', filename?: string) => Promise<void>;
export type DocumentStream = (
  url: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
) => Promise<void>;
