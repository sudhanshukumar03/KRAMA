import { prisma } from '../prisma';
import type { DocumentType } from '@prisma/client';

export async function getDocumentGraph(id: string, rootId?: string, maxDepth = 2) {
    const maxNodesCap = 150; // Cap at 150 nodes

    let docIdsToInclude: Set<string> = new Set();

    if (rootId) {
      // Seed validation: the rootId must be a live document in this workspace.
      // Otherwise a crafted rootId would kick off a BFS rooted in another
      // workspace's graph (the final metadata fetch is workspace-scoped, so
      // nothing leaks, but we short-circuit rather than walk foreign links).
      const rootDoc = await prisma.document.findFirst({
        where: { id: rootId, deletedAt: null, space: { workspaceId: id } },
        select: { id: true }
      });
      if (!rootDoc) {
        return { nodes: [], links: [] };
      }

      // BFS traversal starting from rootId up to maxDepth
      const visited = new Set<string>([rootId]);
      let currentQueue: string[] = [rootId];
      let currentDepth = 0;

      while (currentQueue.length > 0 && currentDepth <= maxDepth && visited.size < maxNodesCap) {
        const nextQueue: string[] = [];
        for (const currentId of currentQueue) {
          if (visited.size >= maxNodesCap) break;
          // Find connected entity links (outgoing & incoming for DOCUMENT)
          const links = await prisma.entityLink.findMany({
            where: {
              OR: [
                { sourceType: 'DOCUMENT', sourceId: currentId },
                { targetType: 'DOCUMENT', targetId: currentId }
              ]
            }
          });
          for (const l of links) {
            const neighborId = l.sourceId === currentId ? (l.targetType === 'DOCUMENT' ? l.targetId : null) : l.sourceId;
            if (neighborId && !visited.has(neighborId)) {
              visited.add(neighborId);
              nextQueue.push(neighborId);
              if (visited.size >= maxNodesCap) break;
            }
          }
        }
        currentQueue = nextQueue;
        currentDepth++;
      }
      docIdsToInclude = visited;
    } else {
      const docs = await prisma.document.findMany({
        where: {
          space: { workspaceId: id, deletedAt: null },
          deletedAt: null
        },
        take: maxNodesCap,
        select: { id: true }
      });
      docIdsToInclude = new Set(docs.map(d => d.id));
    }

    // Retrieve documents metadata — always workspace-scoped. The rootId BFS above
    // walks entity links, which (in legacy data) could reach documents in other
    // workspaces; constraining the metadata fetch to this workspace's spaces keeps
    // a crafted rootId from surfacing foreign documents in the graph.
    const docs = await prisma.document.findMany({
      where: { id: { in: Array.from(docIdsToInclude) }, deletedAt: null, space: { workspaceId: id, deletedAt: null } },
      select: { id: true, title: true, documentType: true }
    });

    const docIds = docs.map(d => d.id);

    // Retrieve links connecting these documents
    const rawLinks = await prisma.entityLink.findMany({
      where: {
        OR: [
          { sourceType: 'DOCUMENT', sourceId: { in: docIds } },
          { targetType: 'DOCUMENT', targetId: { in: docIds } }
        ]
      }
    });

    // Gather external entities (PROJECT and TASK) linked to these documents
    const projectIds = new Set<string>();
    const taskIds = new Set<string>();
    for (const l of rawLinks) {
      if (l.targetType === 'PROJECT') projectIds.add(l.targetId);
      if (l.sourceType === 'PROJECT') projectIds.add(l.sourceId);
      if (l.targetType === 'TASK') taskIds.add(l.targetId);
      if (l.sourceType === 'TASK') taskIds.add(l.sourceId);
    }

    // Workspace-scope the external entities too, so cross-workspace links in
    // legacy data don't pull foreign projects/tasks into the graph.
    const projects = projectIds.size > 0 ? await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) }, workspaceId: id },
      select: { id: true, name: true }
    }) : [];

    const tasks = taskIds.size > 0 ? await prisma.task.findMany({
      where: { id: { in: Array.from(taskIds) }, workspaceId: id },
      select: { id: true, title: true }
    }) : [];

    // Construct nodes list
    const nodes: { id: string; title: string; type: 'DOCUMENT' | 'PROJECT' | 'TASK'; documentType?: DocumentType }[] = docs.map(d => ({
      id: d.id,
      title: d.title,
      type: 'DOCUMENT',
      documentType: d.documentType
    }));

    for (const p of projects) {
      if (nodes.length < maxNodesCap) {
        nodes.push({ id: p.id, title: p.name, type: 'PROJECT' });
      }
    }

    for (const t of tasks) {
      if (nodes.length < maxNodesCap) {
        nodes.push({ id: t.id, title: t.title, type: 'TASK' });
      }
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = rawLinks.filter(l => nodeIds.has(l.sourceId) && nodeIds.has(l.targetId));

    return {
      nodes: nodes.slice(0, maxNodesCap),
      links
    };
}
