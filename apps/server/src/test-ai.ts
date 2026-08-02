import 'dotenv/config';
import { aiService } from './services/ai.service';
import { prisma } from './prisma';

async function run() {
  try {
    const user = await prisma.user.findFirst();
    const workspace = await prisma.workspace.findFirst();
    
    if (!user || !workspace) {
      console.log("No user or workspace found in DB to test with.");
      process.exit(0);
    }

    const res = await aiService.complete({
      prompt: "Reply with exactly one word: BINGO",
      provider: "groq",
      model: "llama-3.1-8b-instant",
      workspaceId: workspace.id,
      userId: user.id
    });
    console.log("ACTUAL AI RESPONSE:", res);
  } catch(e: any) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
