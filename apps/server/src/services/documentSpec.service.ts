import { prisma } from '../prisma';
import { DocumentService } from './document.service';
import type { DocumentType, Prisma } from '@prisma/client';

export async function importDocumentSpecContent(content: string, targetSpaceId: string, workspaceId: string, userId: string, parentId?: string) {
    // 1. Parse YAML frontmatter if present
    let rawContent = content;
    let title = 'Imported Specification';
    let subtitle = '';
    let documentType: DocumentType = 'SPEC';
    let statusBadges: string[] = ['LIVE SPECIFICATION'];
    let tagsList: string[] = [];

    const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const fmText = frontmatterMatch[1] || '';
      rawContent = frontmatterMatch[2] || '';

      const titleMatch = fmText.match(/^title:\s*(.*)$/m);
      if (titleMatch && titleMatch[1]?.trim()) title = titleMatch[1].trim();

      const subtitleMatch = fmText.match(/^subtitle:\s*(.*)$/m);
      if (subtitleMatch && subtitleMatch[1]?.trim()) subtitle = subtitleMatch[1].trim();

      const typeMatch = fmText.match(/^documentType:\s*(.*)$/m);
      if (typeMatch && typeMatch[1]?.trim()) {
        const t = typeMatch[1].trim().toUpperCase();
        if (['SPEC', 'NOTE', 'MEETING', 'IDEA', 'RFC', 'GENERAL'].includes(t)) {
          documentType = t as DocumentType;
        }
      }

      const badgesMatch = fmText.match(/^statusBadges:\s*\[(.*?)\]/m);
      if (badgesMatch && badgesMatch[1]) {
        statusBadges = badgesMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }

      const tagsMatch = fmText.match(/^tags:\s*\[(.*?)\]/m);
      if (tagsMatch && tagsMatch[1]) {
        tagsList = tagsMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }
    }

    // Helper to turn markdown into simple ProseMirror TipTap document
    const markdownToTipTapJson = (md: string) => {
      const paragraphs = md.split(/\n\s*\n/).filter(p => p.trim());
      const contentNodes: Prisma.InputJsonValue[] = [];
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed.startsWith('# ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: trimmed.slice(2).trim() }] });
        } else if (trimmed.startsWith('## ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: trimmed.slice(3).trim() }] });
        } else if (trimmed.startsWith('### ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: trimmed.slice(4).trim() }] });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          contentNodes.push({
            type: 'bulletList',
            content: items.map(it => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: it.replace(/^[-*]\s*/, '').trim() }] }]
            }))
          });
        } else if (trimmed.startsWith('```')) {
          contentNodes.push({
            type: 'codeBlock',
            content: [{ type: 'text', text: trimmed.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '') }]
          });
        } else {
          contentNodes.push({
            type: 'paragraph',
            content: [{ type: 'text', text: trimmed }]
          });
        }
      }
      return {
        type: 'doc',
        content: contentNodes.length > 0 ? contentNodes : [{ type: 'paragraph', content: [{ type: 'text', text: md }] }]
      };
    };

    // Split root markdown vs nested child headings (## Heading)
    const childSections = rawContent.split(/\n(?=##\s+)/);
    const rootBodyMd = childSections[0] || '';

    // Create root document
    const rootDoc = await DocumentService.createDocument({
      spaceId: targetSpaceId,
      parentId: parentId || undefined,
      title,
      subtitle: subtitle || undefined,
      documentType,
      statusBadges: statusBadges.length > 0 ? statusBadges : ['LIVE SPECIFICATION'],
      contentJson: markdownToTipTapJson(rootBodyMd),
      createdById: userId,
    });

    // Attach tags to rootDoc
    for (const tagName of tagsList) {
      let tag = await prisma.tag.findUnique({
        where: { workspaceId_name: { workspaceId, name: tagName.toLowerCase() } }
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { workspaceId, name: tagName.toLowerCase() }
        });
      }
      await prisma.documentTag.upsert({
        where: { documentId_tagId: { documentId: rootDoc.id, tagId: tag.id } },
        create: { documentId: rootDoc.id, tagId: tag.id },
        update: {}
      });
    }

    // Process nested child sections (up to depth 2: ## Child, depth 3: ### Grandchild)
    let totalImported = 1;
    const rootDepth = await DocumentService.getDepth(rootDoc.id);

    if (rootDepth < 3) {
      for (let i = 1; i < childSections.length; i++) {
        const section = childSections[i] || '';
        const lines = section.split('\n');
        const headingLine = lines[0] || '';
        const childTitle = headingLine.replace(/^##\s+/, '').trim() || `Child Document ${i}`;

        // Grandchild sections inside this child section
        const grandchildSections = lines.slice(1).join('\n').split(/\n(?=###\s+)/);
        const childBodyMd = grandchildSections[0] || '';

        const childDoc = await DocumentService.createDocument({
          spaceId: targetSpaceId,
          parentId: rootDoc.id,
          title: childTitle,
          documentType: 'SPEC',
          statusBadges: ['SUB-SPEC'],
          contentJson: markdownToTipTapJson(childBodyMd),
          createdById: userId,
        });
        totalImported++;

        // Process grandchildren if depth allows
        const childDepth = rootDepth + 1;
        if (childDepth < 3) {
          for (let j = 1; j < grandchildSections.length; j++) {
            const gcSection = grandchildSections[j] || '';
            const gcLines = gcSection.split('\n');
            const gcHeading = gcLines[0] || '';
            const gcTitle = gcHeading.replace(/^###\s+/, '').trim() || `Grandchild Document ${j}`;
            const gcBodyMd = gcLines.slice(1).join('\n');

            await DocumentService.createDocument({
              spaceId: targetSpaceId,
              parentId: childDoc.id,
              title: gcTitle,
              documentType: 'SPEC',
              statusBadges: ['SUB-SPEC'],
              contentJson: markdownToTipTapJson(gcBodyMd),
              createdById: userId,
            });
            totalImported++;
          }
        }
      }
    }

    const fullRoot = await prisma.document.findUnique({
      where: { id: rootDoc.id },
      include: { tags: { include: { tag: true } } }
    });

    return {
      document: fullRoot,
      totalImported,
      message: `Successfully imported spec "${title}" with ${totalImported} documents.`
    };
}
