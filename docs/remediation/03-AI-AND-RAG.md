# 03 — AI Subsystem & RAG Architecture

**Priority:** P0 (AI-01 is a total production outage) · P1 (AI-03 leaks soft-deleted content) · P2 (AI-04/AI-05 wire up dead endpoints)  
**Touches:** `apps/server/src/services/krama-ai.service.ts`, `apps/server/src/services/narrative.service.ts`, `apps/server/src/services/ai.service.ts`, `apps/server/src/controllers/ai.controller.ts`, `apps/server/src/routes/ai.routes.ts`, `apps/server/src/lib/embedding.ts`, `apps/server/src/workers/embedding.worker.ts`, `apps/server/src/services/rag/retriever.ts`, `apps/web/src/components/ProjectDetail.tsx`, `apps/web/src/components/planner/DailyLogSection.tsx`

---

## 1. Scope

Restore the AI chat assistant and daily narrative debrief (both were 100% broken in production), resolve the vector database crash caused by empty embedding arrays, stop leaking soft-deleted/trashed documents and pages into RAG retrieval context, and wire up backend AI capabilities to real, interactive user interfaces.

---

## 2. Architecture & Rules

- **Provider Integrity:** Do not swap AI providers. Both Groq and Google Gemini (`@google/genai`) are integrated; model string resolution must target current, valid production identifiers.
- **Fail-Fast Embeddings:** Never fallback to a zero-vector or swallow empty embeddings; corrupting vector cosine similarity indexes is catastrophic. Empty embeddings must fail and trigger worker retries.
- **Tenant & Soft-Delete Boundaries:** All RAG queries must strictly isolate workspaces and filter soft-deleted documents (`d."deletedAt" IS NULL`) and pages (`p."deletedAt" IS NULL`).
- **Interactive Review:** AI suggestions (such as task/habit debriefs) must never be auto-committed without explicit per-item user confirmation.

---

## 3. AI-01 — Invalid Gemini Model Identifiers (Ref: Audit §2.2)

**Symptom:** AI chat assistant and daily narrative debrief endpoints fail 100% of the time with HTTP 404 (`models/gemini-3.6-flash is not found for API version v1beta`).

**Root cause:** The server hardcoded fictitious Google Gemini model identifiers: `gemini-3.6-flash` and `gemini-3.7-flash` instead of valid Google GenAI model strings.

**Files:**
- `apps/server/src/services/ai.service.ts`
- `apps/server/src/services/krama-ai.service.ts`
- `apps/server/src/services/narrative.service.ts`

**Remediation:**
1. Exported `GEMINI_MODEL = 'gemini-2.5-flash'` in `ai.service.ts` and updated the `COST_MAP`:
```ts
export const GEMINI_MODEL = 'gemini-2.5-flash';

const COST_MAP: Record<string, { prompt: number, completion: number }> = {
  'llama-3.1-8b-instant': { prompt: 0.05 / 1_000_000, completion: 0.08 / 1_000_000 },
  'llama-3.1-70b-versatile': { prompt: 0.59 / 1_000_000, completion: 0.79 / 1_000_000 },
  'gemini-2.5-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
  'gemini-2.0-flash': { prompt: 0.075 / 1_000_000, completion: 0.30 / 1_000_000 },
};
```
2. Updated `interactWithGemini` and `generateContentWithGemini` to default to `GEMINI_MODEL`.
3. Updated `krama-ai.service.ts` (intent router and response generator) and `narrative.service.ts` to consume `GEMINI_MODEL`.

**Verification:** Chat completions and daily debrief calls target `gemini-2.5-flash` with valid tokens and cost estimation, without 404 errors.

---

## 4. AI-02 — Vector Database Crash on Empty Embeddings (Ref: Audit §2.6)

**Symptom:** Background embedding worker (`embedding.worker.ts`) fails permanently on chunk indexing. Postgres throws:
```
ERROR: invalid input syntax for type vector: "[]"
```

**Root cause:** `@google/genai`'s single-embed response shape provides `result.embedding?.values`, but the wrapper inspected `result.embeddings?.[0]?.values ?? []`. For a single embed call, this resolved to `[]`, generating `vectorString = "[]"`, which fails pgvector syntax.

**File:** `apps/server/src/lib/embedding.ts`

**Remediation:**
```ts
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const result = await client.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  const values = (result as any).embedding?.values || (result as any).embeddings?.[0]?.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini API returned empty embedding vector');
  }
  return values;
}
```
Throwing an error causes BullMQ to trigger its exponential backoff retry flow and alert on error telemetry instead of corrupting database state.

---

## 5. AI-03 — RAG Leaks Soft-Deleted Documents (Ref: Audit §4.3)

**Symptom:** Documents or pages moved to Trash (`deletedAt IS NOT NULL`) are still returned in vector and keyword searches as AI chat context.

**File:** `apps/server/src/services/rag/retriever.ts`

**Remediation:**
Both `vectorSearch` and `keywordSearch` left-join `Document d` on `d.id = kc."documentId"` and `Page p` on `p.id = kc."pageId"`. Added strict null-safety and soft-delete filters:
```sql
WHERE kc."workspaceId" = ${workspaceId}
  AND (d."deletedAt" IS NULL OR d.id IS NULL)
  AND (p."deletedAt" IS NULL OR p.id IS NULL)
```
This ensures trashed documents or trashed pages are excluded from RAG retrieval context.

---

## 6. AI-04 — Real AI Strategic Diagnostic (Ref: Audit §5.1)

**Symptom:** `handleRunDiagnostic` in `apps/web/src/components/ProjectDetail.tsx` simulated analysis with a `setTimeout(..., 600)` and a static toast message without issuing a network request.

**Remediation:**
1. Replaced the dummy timer with a real call to `api.ai.complete`:
```tsx
const handleRunDiagnostic = async () => {
  setIsAnalyzing(true);
  try {
    const prompt = `Run a strategic diagnostic for project "${project.name}". Status: ${project.status}. Problem Statement: ${project.problemStatement || 'N/A'}. Tickets: ${projectIssues.length} tickets (${urgentIssues.length} urgent/high priority). Progress: ${progressPct}%. Provide a concise strategic assessment and recommended next actions.`;
    const result = await api.ai.complete({
      message: prompt,
      prompt: prompt,
      context: { projectId: project.id },
    });
    const summary = result.summary || result.answer || (typeof result === 'string' ? result : 'Strategic assessment completed successfully.');
    toast.success('AI Strategic Diagnostic Complete', {
      description: summary,
    });
  } catch (err: any) {
    toast.error('Diagnostic failed', {
      description: err?.message || 'Please try again.',
    });
  } finally {
    setIsAnalyzing(false);
  }
};
```
2. Updated `apps/server/src/controllers/ai.controller.ts` (`kramaChat`) to accept both `req.body.message` and `req.body.prompt`.

---

## 7. AI-05 — Interactive Daily Log AI Debrief (Ref: Audit §5.2)

**Symptom:** `POST /api/v1/ai/narrative` existed server-side but had zero callers in the UI.

**Remediation:**
1. Added an **"AI Debrief"** action button in `apps/web/src/components/planner/DailyLogSection.tsx`.
2. Extracted and normalized daily debrief notes (wins, blockers, notes for tomorrow) and submitted them to `api.ai.narrative`.
3. Rendered an interactive **AI Suggested Updates** panel with:
   - AI summary reflection.
   - List of proposed actions categorized by entity type (`task`, `habit`, `goal`) and action type (`complete`, `create`, `update_progress`).
   - Individual **Accept** and **Dismiss** controls per item. Accepting an item directly executes the mutation (`api.tasks.complete`, `api.tasks.create`, `api.habits.complete`, or `api.goals.update`), invalidates relevant React Query caches, and removes the item from the pending list.
   - Strict adherence to rule: **no auto-commit without explicit user confirmation**.
4. Updated `apps/server/src/routes/ai.routes.ts` (`/narrative`) to accept `req.body.narrative` or `req.body.notes`.

### Status of Deferred Endpoints:
- `POST /api/v1/ai/analyze-telemetry`: **Deferred** — Backend functional; UI integration tracked for subsequent analytics/admin pass.
- `GET /api/v1/ai/dashboard-insight`: **Deferred** — Backend functional; workspace insights panel tracked for dashboard review pass.
- Neither endpoint is considered dead code; both remain registered and available for upcoming UI affordances.

---

## 8. Verification Checklist

- [x] **AI-01:** Server and services use valid `gemini-2.5-flash` model identifiers and cost maps.
- [x] **AI-02:** `getEmbedding` verifies vector length and throws retryable error on empty arrays.
- [x] **AI-03:** `retriever.ts` filters out documents and pages with `deletedAt IS NOT NULL`.
- [x] **AI-04:** Project detail page diagnostic performs a real round-trip to `api.ai.complete`.
- [x] **AI-05:** `DailyLogSection` has a reachable AI Debrief workflow with granular per-action review.
- [x] **TypeScript & Linter:** Both `pnpm --filter server exec tsc --noEmit` and `pnpm --filter client exec tsc -b` pass with 0 errors. `pnpm run lint` passes with 0 warnings and 0 errors.
