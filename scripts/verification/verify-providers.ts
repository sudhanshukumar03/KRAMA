import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const root = resolve(__dirname,'../..');
const requireServer = createRequire(resolve(root,'apps/server/package.json'));
requireServer('dotenv').config({ path: resolve(root,'apps/server/.env'), quiet: true });
const selected = process.argv[2] || 'all';
if (!['all','groq','gemini'].includes(selected)) throw new Error('Choose all, groq or gemini.');
const redact = (value: unknown) => ['GROQ_API_KEY','GEMINI_API_KEY','DATABASE_URL','REDIS_URL','JWT_SECRET'].reduce((text,key) => process.env[key] ? text.replaceAll(process.env[key]!, '[redacted]') : text, String(value)).slice(0,350);
async function main() {
  const { getGeminiClient, GROQ_MODEL, GEMINI_MODEL } = await import('../../apps/server/src/services/ai.service');
  const checks: { name: string; model: string; run: () => Promise<string> }[] = [{ name: 'Gemini embedding', model: 'gemini-embedding-001', run: async () => {
    const result = await getGeminiClient().models.embedContent({ model: 'gemini-embedding-001', contents: 'Synthetic KRAMA verification. Launch identifier SAPPHIRE42.', config: { outputDimensionality: 768, httpOptions: { timeout: 20000 } } });
    const vector = result.embeddings?.[0]?.values;
    if (vector?.length !== 768 || !vector.every(Number.isFinite)) throw new Error('Invalid embedding vector.');
    return '768 finite dimensions';
  } }];
  if (selected !== 'gemini') checks.push({ name: 'Groq text', model: GROQ_MODEL, run: async () => {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is required for this check.');
    const Groq = requireServer('groq-sdk').default;
    const result = await new Groq({ apiKey: process.env.GROQ_API_KEY }).chat.completions.create({ model: GROQ_MODEL, messages: [{ role: 'user', content: 'Reply with the single word READY.' }], max_completion_tokens: 512 }, { timeout: 20000, maxRetries: 0 });
    if (!result.choices[0]?.message?.content?.trim()) throw new Error('No completion.');
    return 'nonempty completion';
  } });
  if (selected !== 'groq') checks.push({ name: 'Gemini text', model: GEMINI_MODEL, run: async () => {
    const result = await getGeminiClient().models.generateContent({ model: GEMINI_MODEL, contents: 'Reply with the single word READY.', config: { maxOutputTokens: 128, httpOptions: { timeout: 20000 } } });
    if (!result.text?.trim()) throw new Error('No completion.'); return 'nonempty completion';
  } });
  for (const check of checks) {
    try { console.log(JSON.stringify({ check: check.name, model: check.model, passed: true, result: await check.run() })); }
    catch (error: any) { process.exitCode = 1; console.log(JSON.stringify({ check: check.name, model: check.model, passed: false, status: error.status || error.statusCode, message: redact(error.message) })); }
  }
}
main().catch(error => { process.exitCode = 1; console.error(redact(error.message)); }).finally(async () => {
  const { prisma } = await import('../../apps/server/src/prisma'); await prisma.$disconnect();
  await (globalThis as typeof globalThis & { pool?: { end(): Promise<void> } }).pool?.end();
});
