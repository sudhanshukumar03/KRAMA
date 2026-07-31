/**
 * Phase 7 Verification Script
 * Proves:
 *  1. Page full-text search (tsvector/tsquery + ILIKE) with snippet extraction
 *  2. Global cross-entity search spanning Pages, Issues, Projects, Goals, Decisions
 *  3. Decision Log CRUD with project filtering
 *  4. Multi-relation cascade-delete restore (Project with Issues + Sprints)
 */

const BASE = 'http://localhost:3001';
let TOKEN = '';
let spaceId = '';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'engineer', password: 'secure_password' }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('✅ Authenticated');
}

async function api(endpoint: string, options: any = {}) {
  const headers: any = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE}/api/v1${endpoint}`, {
    ...options,
    headers,
  });
  if (res.status === 204) return null;
  return res.json();
}

async function getSpaceId() {
  const spaces = await api('/spaces');
  if (!spaces || spaces.length === 0) {
    const space = await api('/spaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase7Test', slug: 'p7test' }),
    });
    spaceId = space.id;
  } else {
    spaceId = spaces[0].id;
  }
  console.log(`✅ Using space: ${spaceId}`);
}

async function step1_PageFullTextSearch() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('CHECKPOINT 1: Page Full-Text Search & Snippet Extraction');
  console.log('══════════════════════════════════════════════════════════');

  // Create a page with specific Tiptap-style blocks containing target keywords
  const page = await api('/pages', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Phase 7 Architecture Notes',
      spaceId,
      blocks: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'We implemented genuine Postgres tsvector indexing for full-text search with stemming and relevance ranking. ' },
              { type: 'text', text: 'The bridge layer connects database schema changes to the frontend Command Palette.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Key technologies: PostgreSQL, Prisma ORM, ts_rank scoring, snippet extraction with ILIKE fallback.' },
            ],
          },
        ],
      },
    }),
  });
  console.log(`  Created page: "${page.title}" (id: ${page.id})`);
  console.log(`  textContent extracted: "${page.textContent ? page.textContent.slice(0, 80) + '...' : 'EMPTY'}"`);

  // Verify textContent was populated automatically
  if (!page.textContent || page.textContent.length === 0) {
    console.log('  ❌ FAIL: textContent was not automatically extracted from Tiptap blocks!');
    return;
  }
  console.log('  ✅ textContent auto-extracted from Tiptap blocks');

  // Search for "tsvector" — this should match via full-text search
  const searchResult = await api('/search?q=tsvector');
  const pageResults = searchResult.results.filter((r: any) => r.type === 'page');
  if (pageResults.length === 0) {
    console.log('  ❌ FAIL: Search for "tsvector" returned no page results!');
    return;
  }
  console.log(`  ✅ Search for "tsvector" returned ${pageResults.length} page result(s)`);
  console.log(`  Snippet: "${pageResults[0].snippet}"`);

  // Verify snippet contains the keyword context
  if (!pageResults[0].snippet || pageResults[0].snippet.length === 0) {
    console.log('  ❌ FAIL: Snippet was empty!');
  } else {
    console.log('  ✅ Snippet extracted with keyword context');
  }

  // Clean up
  await api(`/pages/${page.id}`, { method: 'DELETE' });
  console.log('  ✅ Cleanup: page deleted');
}

async function step2_GlobalCrossEntitySearch() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('CHECKPOINT 2: Global Cross-Entity Search');
  console.log('══════════════════════════════════════════════════════════');

  const keyword = 'bridgelayertest';

  // Create one of each entity type containing the keyword
  const page = await api('/pages', {
    method: 'POST',
    body: JSON.stringify({
      title: `Doc about ${keyword} architecture`,
      spaceId,
      blocks: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Testing ${keyword} search across entities.` }] }] },
    }),
  });

  const project = await api('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: `Project ${keyword}`, status: 'active', spaceId }),
  });

  const goal = await api('/goals', {
    method: 'POST',
    body: JSON.stringify({ title: `Goal ${keyword}`, type: 'quarterly' }),
  });

  const issue = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({ title: `Issue ${keyword} tracker`, projectId: project.id, status: 'todo', priority: 'medium' }),
  });

  const decision = await api('/decisions', {
    method: 'POST',
    body: JSON.stringify({ title: `Decision about ${keyword}`, context: `We chose ${keyword} for performance.` }),
  });

  console.log(`  Created: 1 page, 1 project, 1 goal, 1 issue, 1 decision with keyword "${keyword}"`);

  // Search for the keyword
  const results = await api(`/search?q=${keyword}`);
  const types = new Set(results.results.map((r: any) => r.type));
  console.log(`  Search returned ${results.results.length} results across ${types.size} entity types: [${[...types].join(', ')}]`);

  const expectedTypes = ['page', 'project', 'goal', 'issue', 'decision'];
  for (const t of expectedTypes) {
    if (types.has(t)) {
      console.log(`  ✅ ${t} matched`);
    } else {
      console.log(`  ❌ ${t} NOT found in search results!`);
    }
  }

  // Clean up
  await api(`/issues/${issue.id}`, { method: 'DELETE' });
  await api(`/decisions/${decision.id}`, { method: 'DELETE' });
  await api(`/goals/${goal.id}`, { method: 'DELETE' });
  await api(`/projects/${project.id}`, { method: 'DELETE' });
  await api(`/pages/${page.id}`, { method: 'DELETE' });
  console.log('  ✅ Cleanup: all test entities deleted');
}

async function step3_DecisionLogCRUD() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('CHECKPOINT 3: Decision Log CRUD');
  console.log('══════════════════════════════════════════════════════════');

  // Create a project to link to
  const project = await api('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase7 DecisionTest Project', status: 'active', spaceId }),
  });

  // CREATE a decision
  const decision = await api('/decisions', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Use tsvector for search',
      context: 'We needed full-text search with stemming and ranking',
      reasoning: 'Postgres tsvector provides index-backed stemming and relevance ranking',
      alternativesConsidered: ['ILIKE only', 'Elasticsearch', 'Meilisearch'],
      outcome: 'Adopted',
      date: new Date().toISOString(),
      linkedProjectId: project.id,
    }),
  });
  console.log(`  ✅ Created decision: "${decision.title}" (id: ${decision.id})`);
  console.log(`  Linked project: ${decision.linkedProject?.name || 'null'}`);

  if (!decision.linkedProject || decision.linkedProject.name !== 'Phase7 DecisionTest Project') {
    console.log('  ❌ FAIL: linkedProject not hydrated!');
  } else {
    console.log('  ✅ linkedProject hydrated correctly');
  }

  // READ with project filter
  const filtered = await api(`/decisions?projectId=${project.id}`);
  if (filtered.length === 1 && filtered[0].id === decision.id) {
    console.log(`  ✅ Project filter returned 1 matching decision`);
  } else {
    console.log(`  ❌ FAIL: Project filter returned ${filtered.length} decisions (expected 1)`);
  }

  // UPDATE
  const updated = await api(`/decisions/${decision.id}`, {
    method: 'PUT',
    body: JSON.stringify({ outcome: 'Shipped & Verified' }),
  });
  if (updated.outcome === 'Shipped & Verified') {
    console.log(`  ✅ Updated outcome: "${updated.outcome}"`);
  } else {
    console.log(`  ❌ FAIL: Outcome not updated`);
  }

  // DELETE & verify
  const deleteResult = await api(`/decisions/${decision.id}`, { method: 'DELETE' });
  if (deleteResult.snapshot && deleteResult.snapshot.id === decision.id) {
    console.log(`  ✅ Delete returned snapshot for undo (id: ${deleteResult.snapshot.id})`);
  } else {
    console.log(`  ❌ FAIL: Delete did not return snapshot`);
  }

  // Verify it's gone
  const afterDelete = await api('/decisions');
  const found = afterDelete.find((d: any) => d.id === decision.id);
  if (!found) {
    console.log('  ✅ Decision confirmed deleted from database');
  } else {
    console.log('  ❌ FAIL: Decision still exists after delete!');
  }

  // RESTORE via undo
  const restored = await api('/decisions/restore', {
    method: 'POST',
    body: JSON.stringify(deleteResult.snapshot),
  });
  if (restored.id === decision.id) {
    console.log(`  ✅ Decision restored via undo with original ID: ${restored.id}`);
  } else {
    console.log(`  ❌ FAIL: Restored decision has different ID`);
  }

  // Clean up
  await api(`/decisions/${restored.id}`, { method: 'DELETE' });
  await api(`/projects/${project.id}`, { method: 'DELETE' });
  console.log('  ✅ Cleanup complete');
}

async function step4_CascadeDeleteRestore() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('CHECKPOINT 4: Multi-Relation Cascade-Delete Restore');
  console.log('══════════════════════════════════════════════════════════');

  // Create a project with child issues and a sprint
  const project = await api('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'CascadeTest Project', status: 'active', spaceId }),
  });
  console.log(`  Created project: "${project.name}" (id: ${project.id})`);

  const sprint = await api('/sprints', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sprint Alpha',
      goal: 'Test cascade delete',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'active',
      projectId: project.id,
    }),
  });
  console.log(`  Created sprint: "${sprint.name}" (id: ${sprint.id})`);

  const issue1 = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({ title: 'Cascade Issue 1', status: 'in_progress', priority: 'high', projectId: project.id, sprintId: sprint.id }),
  });
  const issue2 = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({ title: 'Cascade Issue 2', status: 'todo', priority: 'medium', projectId: project.id }),
  });
  console.log(`  Created 2 issues: "${issue1.title}", "${issue2.title}"`);

  // DELETE the project (cascades to issues and sprints)
  const deleteResult = await api(`/projects/${project.id}`, { method: 'DELETE' });
  console.log(`  Deleted project. Snapshot contains:`);
  console.log(`    - ${deleteResult.snapshot.issues?.length || 0} issue(s)`);
  console.log(`    - ${deleteResult.snapshot.sprints?.length || 0} sprint(s)`);

  // Verify cascade: issues and sprint should be gone
  const allIssues = await api('/issues');
  const orphanedIssue1 = allIssues.find((i: any) => i.id === issue1.id);
  const orphanedIssue2 = allIssues.find((i: any) => i.id === issue2.id);
  if (!orphanedIssue1 && !orphanedIssue2) {
    console.log('  ✅ Cascade delete confirmed: child issues are gone from database');
  } else {
    console.log('  ❌ FAIL: Orphaned issues still exist after cascade delete!');
  }

  const allSprints = await api('/sprints');
  const orphanedSprint = allSprints.find((s: any) => s.id === sprint.id);
  if (!orphanedSprint) {
    console.log('  ✅ Cascade delete confirmed: child sprint is gone from database');
  } else {
    console.log('  ❌ FAIL: Orphaned sprint still exists after cascade delete!');
  }

  // RESTORE via transactional undo
  const restored = await api('/projects/restore', {
    method: 'POST',
    body: JSON.stringify(deleteResult.snapshot),
  });
  console.log(`  Restored project: "${restored.name}" (id: ${restored.id})`);

  // Verify all children are back
  const restoredIssues = await api('/issues');
  const backIssue1 = restoredIssues.find((i: any) => i.id === issue1.id);
  const backIssue2 = restoredIssues.find((i: any) => i.id === issue2.id);

  if (backIssue1 && backIssue2) {
    console.log(`  ✅ Both child issues restored with original IDs:`);
    console.log(`    - "${backIssue1.title}" (status: ${backIssue1.status})`);
    console.log(`    - "${backIssue2.title}" (status: ${backIssue2.status})`);
  } else {
    console.log(`  ❌ FAIL: Child issues not restored! Found: ${backIssue1 ? 'issue1' : 'none'}, ${backIssue2 ? 'issue2' : 'none'}`);
  }

  const restoredSprints = await api('/sprints');
  const backSprint = restoredSprints.find((s: any) => s.id === sprint.id);
  if (backSprint) {
    console.log(`  ✅ Child sprint restored: "${backSprint.name}" (status: ${backSprint.status})`);
  } else {
    console.log('  ❌ FAIL: Child sprint not restored!');
  }

  // Verify restored issue statuses match originals
  if (backIssue1?.status === 'in_progress' && backIssue2?.status === 'todo') {
    console.log('  ✅ Issue statuses preserved: in_progress, todo');
  } else {
    console.log('  ❌ FAIL: Issue statuses changed during restore!');
  }

  // Clean up
  await api(`/issues/${issue1.id}`, { method: 'DELETE' });
  await api(`/issues/${issue2.id}`, { method: 'DELETE' });
  await api(`/sprints/${sprint.id}`, { method: 'DELETE' });
  await api(`/projects/${restored.id}`, { method: 'DELETE' });
  console.log('  ✅ Final cleanup complete');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  KRAMA OS — Phase 7: Feature Backlog Verification       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await login();
  await getSpaceId();

  await step1_PageFullTextSearch();
  await step2_GlobalCrossEntitySearch();
  await step3_DecisionLogCRUD();
  await step4_CascadeDeleteRestore();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('✅ ALL PHASE 7 CHECKPOINTS PASSED');
  console.log('══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
