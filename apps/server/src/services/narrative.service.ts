import { SkillService } from './skill.service';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../prisma';
import { z } from 'zod';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// We define the schema for proposed actions
const NarrativeResponseSchema = z.object({
  summary: z.string().describe("A brief, encouraging summary of what the user accomplished."),
  actions: z.array(z.object({
    id: z.string().optional(),
    entityType: z.enum(['task', 'habit', 'goal']),
    action: z.enum(['complete', 'create', 'update_progress']),
    title: z.string().describe("Title or name of the entity"),
    metadata: z.record(z.string(), z.any()).optional().describe("Additional data like new progress percentage, priority, etc."),
    confidence: z.number().describe("Confidence from 0 to 1 that this is what the user meant")
  }))
});

export const narrativeService = {
  async processNarrative(narrative: string, workspaceId: string, userId: string) {
    // 1. Fetch user's active entities to match against
    const [tasks, habits, goals, skillsContext] = await Promise.all([
      prisma.task.findMany({ where: { workspaceId, status: { not: 'DONE' } }, select: { id: true, title: true, status: true } }),
      prisma.habit.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
      prisma.goal.findMany({ where: { workspaceId }, select: { id: true, title: true, progress: true } }),
      SkillService.getUserSkillsForAiContext(userId)
    ]);

    const contextStr = `
USER's ACTIVE TASKS:
${tasks.map(t => `- [${t.id}] ${t.title} (Status: ${t.status})`).join('\n')}

USER's HABITS:
${habits.map(h => `- [${h.id}] ${h.name}`).join('\n')}

USER's GOALS:
${goals.map(g => `- [${g.id}] ${g.title} (Progress: ${g.progress}%)`).join('\n')}
    `.trim();

    const prompt = `
You are the KRAMA AI Daily Narrative Assistant.
The user is describing their day in plain language.
Your job is to parse their narrative and propose specific database updates based on their existing Tasks, Habits, and Goals.

NARRATIVE:
"${narrative}"

${contextStr}

INSTRUCTIONS:
1. Identify any existing tasks the user says they completed or worked on. Propose 'complete' action for them.
2. Identify any existing habits they did today. Propose 'complete' action for them.
3. Identify if they made progress on a goal. Propose 'update_progress' action.
4. If they mention a new thing they need to do, propose 'create' action for a 'task'.
5. Always return a valid JSON matching the schema below.

Output exactly a JSON object matching this schema:
{
  "summary": "String",
  "actions": [
    {
      "id": "String (the UUID from the context, omit if creating new)",
      "entityType": "task" | "habit" | "goal",
      "action": "complete" | "create" | "update_progress",
      "title": "String",
      "metadata": { ... },
      "confidence": 0.0 to 1.0
    }
  ]
}
`;

    // 3. Call Gemini API
    const response = await genAI.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text || '{}';
    try {
      const parsed = JSON.parse(text);
      return parsed; // NarrativeResponseSchema
    } catch (e) {
      console.error('Failed to parse Narrative Assistant response:', text);
      return { summary: "Failed to parse AI response.", actions: [] };
    }
  }
};
