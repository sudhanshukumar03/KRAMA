import type { Response } from 'express';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { GROQ_MODEL, GEMINI_MODEL } from './ai.service';
import { streamWithFallback, type TextStreamProvider } from '../lib/providerStream';

export async function sendBrainAiStream(res: Response, systemPrompt: string, prompt: string) {
  const controller = new AbortController();
  const onDisconnect = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onDisconnect);
  const providers: TextStreamProvider[] = [];
  if (process.env.GROQ_API_KEY) providers.push(async signal => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      stream: true,
    }, { signal, timeout: 30000, maxRetries: 0 });
    return (async function* () { for await (const chunk of stream) yield chunk.choices[0]?.delta?.content || ''; })();
  });
  if (process.env.GEMINI_API_KEY) providers.push(async signal => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL, contents: prompt,
      config: { systemInstruction: systemPrompt, abortSignal: signal, httpOptions: { timeout: 60000 }, maxOutputTokens: 2048 },
    });
    return (async function* () { for await (const chunk of stream) yield chunk.text || ''; })();
  });
  const headers = () => {
    if (res.headersSent) return;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  };
  try {
    for await (const text of streamWithFallback(providers, controller.signal)) {
      if (res.destroyed || res.writableEnded) return;
      headers(); res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    if (!res.destroyed && !res.writableEnded) { headers(); res.write('data: [DONE]\n\n'); res.end(); }
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally { res.off('close', onDisconnect); }
}
