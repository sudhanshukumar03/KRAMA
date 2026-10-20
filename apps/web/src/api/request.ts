/** JSON domain adapters share the authenticated transport supplied by client.ts. */
export type JsonRequest = <T>(endpoint: string, options?: RequestInit) => Promise<T>;
