export function extractPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.type === 'mention') {
    return `@${node.attrs?.label || node.attrs?.id || ''} `;
  }
  if (node.content && Array.isArray(node.content)) {
    const isBlock = [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'taskList',
      'taskItem',
      'blockquote',
      'codeBlock'
    ].includes(node.type);
    return node.content.map(extractPlainText).join(isBlock ? '\n' : '');
  }
  return '';
}

export function extractMarkdown(node: any): string {
  // Markdown extractor for TipTap nodes
  if (!node) return '';
  
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      const isBold = node.marks.find((m: any) => m.type === 'bold');
      const isItalic = node.marks.find((m: any) => m.type === 'italic');
      const isCode = node.marks.find((m: any) => m.type === 'code');
      const linkMark = node.marks.find((m: any) => m.type === 'link');
      if (isCode) text = `\`${text}\``;
      if (isBold) text = `**${text}**`;
      if (isItalic) text = `*${text}*`;
      if (linkMark?.attrs?.href) {
        const href = linkMark.attrs.href;
        const isMentionOrWiki = linkMark.attrs?.class?.includes('mention') || text.trim().startsWith('[[') || text.trim().startsWith('@');
        if (!isMentionOrWiki && href && href !== '#') {
          text = `[${text}](${href})`;
        }
      }
    }
    return text;
  }

  if (node.type === 'mention') {
    return `@${node.attrs?.label || node.attrs?.id || ''} `;
  }

  if (node.content && Array.isArray(node.content)) {
    const childrenMd = node.content.map(extractMarkdown).join('');
    
    switch (node.type) {
      case 'paragraph': return childrenMd + '\n\n';
      case 'heading': return '#'.repeat(node.attrs?.level || 1) + ' ' + childrenMd + '\n\n';
      case 'bulletList': return childrenMd + '\n';
      case 'orderedList': return childrenMd + '\n';
      case 'listItem': return '- ' + childrenMd.trim() + '\n';
      case 'taskList': return childrenMd + '\n';
      case 'taskItem': return `- [${node.attrs?.checked ? 'x' : ' '}] ` + childrenMd.trim() + '\n';
      case 'horizontalRule': return '---\n\n';
      case 'blockquote': return '> ' + childrenMd.trim() + '\n\n';
      case 'codeBlock': {
        const lang = node.attrs?.language || '';
        return '```' + lang + '\n' + childrenMd.trim() + '\n```\n\n';
      }
      case 'doc': return childrenMd;
      default: return childrenMd;
    }
  }

  return '';
}

export function calculateCounts(plainText: string) {
  const charCount = plainText.length;
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  return { charCount, wordCount };
}
