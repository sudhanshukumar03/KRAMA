import express, {} from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
const router = express.Router();
router.use(requireAuth);
function extractSnippet(text, query) {
    if (!text)
        return '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText)
        return '';
    const lowerText = cleanText.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) {
        return cleanText.length > 100 ? cleanText.slice(0, 100) + '...' : cleanText;
    }
    const start = Math.max(0, idx - 40);
    const end = Math.min(cleanText.length, idx + lowerQuery.length + 60);
    let snippet = cleanText.slice(start, end);
    if (start > 0)
        snippet = '...' + snippet;
    if (end < cleanText.length)
        snippet = snippet + '...';
    return snippet;
}
router.get('/', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) {
            res.json({ results: [] });
            return;
        }
        const likeStr = `%${q}%`;
        // 1. Pages: Genuine Postgres full-text search (tsvector/tsquery + ts_rank) combined with ILIKE substring fallback
        const pageResults = await prisma.$queryRaw `
      SELECT id, title, "textContent",
             ts_rank(to_tsvector('english', coalesce(title, '') || ' ' || coalesce("textContent", '')), plainto_tsquery('english', ${q})) as rank
      FROM "Page"
      WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce("textContent", '')) @@ plainto_tsquery('english', ${q})
         OR title ILIKE ${likeStr} OR "textContent" ILIKE ${likeStr}
      ORDER BY rank DESC, "updatedAt" DESC
      LIMIT 15;
    `;
        // 2. Issues
        const issues = await prisma.issue.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        });
        // 3. Projects
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { problemStatement: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        });
        // 4. Goals
        const goals = await prisma.goal.findMany({
            where: {
                title: { contains: q, mode: 'insensitive' },
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        });
        // 5. Decisions
        const decisions = await prisma.decision.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { context: { contains: q, mode: 'insensitive' } },
                    { reasoning: { contains: q, mode: 'insensitive' } },
                    { outcome: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        });
        const results = [
            ...pageResults.map((p) => ({
                id: p.id,
                title: p.title,
                type: 'page',
                snippet: extractSnippet(p.textContent, q),
                url: '/app/brain',
                badge: 'Doc',
            })),
            ...issues.map((i) => ({
                id: i.id,
                title: i.title,
                type: 'issue',
                snippet: extractSnippet(i.description || '', q) || i.status.replace('_', ' '),
                url: '/app/board',
                badge: i.status.replace('_', ' '),
            })),
            ...projects.map((p) => ({
                id: p.id,
                title: p.name,
                type: 'project',
                snippet: extractSnippet(p.problemStatement || '', q) || 'Engineering Project',
                url: `/app/projects/${p.id}`,
                badge: 'Project',
            })),
            ...goals.map((g) => ({
                id: g.id,
                title: g.title,
                type: 'goal',
                snippet: `Progress: ${g.progress || 0}%`,
                url: '/app/goals',
                badge: `${g.progress || 0}%`,
            })),
            ...decisions.map((d) => ({
                id: d.id,
                title: d.title,
                type: 'decision',
                snippet: extractSnippet(d.context || d.reasoning || d.outcome || '', q) || 'Architectural Decision',
                url: '/app/decisions',
                badge: d.outcome || 'Logged',
            })),
        ];
        res.json({ results });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=search.js.map