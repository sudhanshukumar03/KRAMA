export type TiptapNode = {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, any>;
};

export function tiptapToText(
  nodes: TiptapNode[],
  headings: string[] = []
): string {
  let result = "";

  for (const node of nodes) {
    if (node.type === "heading") {
      const level = node.attrs?.level ?? 1;

      const headingText =
        node.content
          ?.map((child) => child.text ?? "")
          .join("") ?? "";

      headings.length = level - 1;
      headings.push(headingText);

      result += `\n\n${headings.join(" > ")}\n`;
    }

    if (node.type === "paragraph") {
      const text =
        node.content
          ?.map((child) => child.text ?? "")
          .join("") ?? "";

      result += `${text}\n`;
    }

    if (node.type === "text") {
      result += `${node.text ?? ""}`;
    }

    if (node.content && node.type !== "heading" && node.type !== "paragraph") {
      result += tiptapToText(node.content, [...headings]);
    }
  }

  return result.trim();
}

export function createChunks(
  text: string,
  maxLength = 3000,
  overlap = 400
) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // Try to find a natural boundary (newline)
    const boundary = text.lastIndexOf("\n", end);

    // If there's a boundary reasonably close to the end, use it
    if (boundary > start + maxLength * 0.6) {
      end = boundary;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c): c is string => Boolean(c));
}
