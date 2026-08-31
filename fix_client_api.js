const fs = require('fs');
let text = fs.readFileSync('apps/web/src/api/client.ts', 'utf8');

text = text.replace(
    "complete: (id: string) => fetchApi<IssueWithRelations>(/tasks/\/complete, { method: 'PATCH' }),",
    "complete: (id: string) => fetchApi<IssueWithRelations>(/tasks/\/complete, { method: 'PATCH' }),\n    addComment: (id: string, content: string) => fetchApi<any>(/tasks/\/comments, { method: 'POST', body: JSON.stringify({ content }) }),"
);

text = text.replace(
    "sprints: {",
    "notifications: {\n    list: () => fetchApi<any[]>('/notifications'),\n    markAsRead: (id: string) => fetchApi<any>(/notifications/\/read, { method: 'PATCH' })\n  },\n  sprints: {"
);

fs.writeFileSync('apps/web/src/api/client.ts', text);
console.log('done');
