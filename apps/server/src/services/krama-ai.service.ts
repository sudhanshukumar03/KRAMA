import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { prisma } from '../prisma';
import { vectorSearch } from './rag/retriever';
import { getEmbedding } from '../lib/embedding';

export const ResponseTypeSchema = z.enum([
  "direct",
  "explanation",
  "recommendation",
  "plan",
  "summary",
  "comparison",
  "rag",
  "action",
]);

export const SourceSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  chunkId: z.string().optional(),
  relevance: z.number().min(0).max(1).optional(),
});

export const ActionSchema = z.object({
  label: z.string(),
  type: z.enum([
    "open_page",
    "create_task",
    "complete_task",
    "open_project",
    "none",
  ]).default("none"),
  id: z.string().optional(),
});

export const AIResponseSchema = z.object({
  type: ResponseTypeSchema,
  title: z.string().optional(),
  answer: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ).default([]),
  actions: z.array(ActionSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;
export type AIIntent = "general" | "knowledge" | "productivity" | "planning" | "task" | "summary";

export class KramaAIService {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  private async detectIntent(message: string): Promise<AIIntent> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are the intent router for KRAMA OS.
Classify the user's request into exactly ONE category:
general, knowledge, productivity, planning, task, summary

Definitions:
general: General knowledge, coding questions, explanations.
knowledge: Questions about information stored inside KRAMA Brain Workspace.
productivity: Questions involving current KRAMA tasks, goals, projects, priorities or blockers.
planning: Questions asking what the user should do, schedule, prioritize or plan.
task: Requests to create, update, complete or modify tasks.
summary: Requests to summarize KRAMA information.

User: ${message}
Return ONLY the category word.`;
    const result = await model.generateContent(prompt);
    const value = result.response.text().trim().toLowerCase();
    const valid: AIIntent[] = ["general", "knowledge", "productivity", "planning", "task", "summary"];
    return valid.includes(value as AIIntent) ? (value as AIIntent) : "general";
  }

  private async getKramaContext(workspaceId: string, userId: string) {
    const [goals, projects, tasks, blockers] = await Promise.all([
      prisma.goal.findMany({ where: { workspaceId }, take: 10, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ where: { workspaceId }, take: 10, orderBy: { createdAt: "desc" } }),
      prisma.task.findMany({ where: { workspaceId, status: { not: "DONE" } }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.task.findMany({ where: { workspaceId, isBlocked: true }, take: 10 }),
    ]);
    return { goals, projects, tasks, blockers };
  }

  private formatKramaContext(context: any) {
    return `KRAMA WORKSPACE CONTEXT

GOALS
${context.goals.map((g: any) => `- ${g.title} | Status: ${g.status || 'ACTIVE'}`).join("\n")}

PROJECTS
${context.projects.map((p: any) => `- ${p.name} | Status: ${p.status}`).join("\n")}

OPEN TASKS
${context.tasks.map((t: any) => `- ${t.title} | Priority: ${t.priority} | Status: ${t.status}`).join("\n")}

BLOCKERS
${context.blockers.map((b: any) => `- ${b.title}`).join("\n")}
`;
  }

  private buildPrompt(message: string, intent: string, kramaContext: string, ragContext?: string) {
    return `You are KRAMA AI.
KRAMA is a productivity operating system.
Your job is to give concise, useful and actionable answers.

USER QUESTION:
${message}

INTENT:
${intent}

CURRENT KRAMA CONTEXT:
${kramaContext}

${ragContext ? `BRAIN WORKSPACE SOURCES:\n${ragContext}\n` : ""}

RESPONSE RULES:
1. Answer the question directly.
2. Do not start with unnecessary phrases such as: "Great question", "Sure", "Absolutely".
3. Keep simple questions short.
4. Use structured sections when useful.
5. Prefer bullet points over long paragraphs.
6. When recommending something, give the recommendation FIRST.
7. When discussing tasks, use actual KRAMA tasks.
8. When RAG sources are provided, do not invent information.
9. Clearly distinguish retrieved facts from recommendations.
10. Include sources when Brain Workspace information was used.
11. Never reveal internal IDs unless needed by the UI.
12. If information is missing, say that it is missing.
13. Do not repeat the user's question.
14. Give a next action when appropriate.

RESPONSE TYPES:
direct, explanation, recommendation, plan, summary, comparison, rag, action

Return ONLY valid JSON matching this schema:
{
  "type": "direct",
  "title": "optional title",
  "answer": "main answer",
  "sections": [{"title": "Why", "content": "..."}],
  "actions": [{"label": "Action", "type": "open_page", "id": "uuid"}],
  "sources": [{"pageId": "uuid", "title": "Page title", "chunkId": "uuid"}],
  "confidence": "high"
}
`;
  }

  private async generateKramaResponse(prompt: string): Promise<AIResponse> {
    const interaction = await this.client.interactions.create({ model: "gemini-3.7-flash", input: prompt, config: { responseMimeType: "application/json" } });
    const raw = interaction.output_text || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { type: "direct", answer: raw, sections: [], actions: [], sources: [] };
    }
    const validated = AIResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return { type: "direct", answer: raw, sections: [], actions: [], sources: [] };
    }
    return validated.data;
  }

  public async askKrama(message: string, workspaceId: string, userId: string, ragEnabled = false) {
    const intent = await this.detectIntent(message);
    const context = await this.getKramaContext(workspaceId, userId);
    const kramaContext = this.formatKramaContext(context);

    let ragContext = "";
    let sourcesList: any[] = [];
    if (ragEnabled || intent === "knowledge") {
      const embedding = await getEmbedding(message);
      const chunks = await vectorSearch(workspaceId, embedding, 8);
      ragContext = chunks.map((chunk: any, i: number) => `SOURCE ${i + 1}\nPage ID: ${chunk.pageId}\nTitle: ${chunk.pageTitle}\nContent:\n${chunk.content}\n`).join("\n");
      sourcesList = chunks.map((chunk: any) => ({ pageId: chunk.pageId, title: chunk.pageTitle, chunkId: chunk.id }));
    }

    const prompt = this.buildPrompt(message, intent, kramaContext, ragContext);
    const response = await this.generateKramaResponse(prompt);
    
    // Inject retrieved sources directly into the response if it's a RAG intent and the AI didn't properly include them
    if (sourcesList.length > 0 && (!response.sources || response.sources.length === 0)) {
        response.sources = sourcesList.slice(0, 3); // top 3
    }
    
    return { ...response, intent };
  }
}

export const kramaAiService = new KramaAIService();
