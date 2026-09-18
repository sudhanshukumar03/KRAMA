export function extractPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractPlainText).join(node.type === 'paragraph' ? '\n\n' : '');
  }
  return '';
}

export function extractMarkdown(node: any): string {
  // A simple markdown extractor for TipTap nodes
  if (!node) return '';
  
  let md = '';
  
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      const isBold = node.marks.find((m: any) => m.type === 'bold');
      const isItalic = node.marks.find((m: any) => m.type === 'italic');
      const isCode = node.marks.find((m: any) => m.type === 'code');
      if (isCode) text = `\`${text}\``;
      if (isBold) text = `**${text}**`;
      if (isItalic) text = `*${text}*`;
    }
    return text;
  }

  if (node.content && Array.isArray(node.content)) {
    const childrenMd = node.content.map(extractMarkdown).join('');
    
    switch (node.type) {
      case 'paragraph': return childrenMd + '\n\n';
      case 'heading': return '#'.repeat(node.attrs?.level || 1) + ' ' + childrenMd + '\n\n';
      case 'bulletList': return childrenMd + '\n';
      case 'orderedList': return childrenMd + '\n';
      case 'listItem': return '- ' + childrenMd + '\n';
      case 'blockquote': return '> ' + childrenMd + '\n\n';
      case 'codeBlock': return '```\n' + childrenMd + '\n```\n\n';
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
