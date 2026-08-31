const fs = require('fs');
let text = fs.readFileSync('apps/web/src/api/client.ts', 'utf8');

// 1. Fix Spaces API
const spacesRegex = /spaces:\s*\{\s*list:\s*async\s*\(\)\s*=>\s*\[\]\s*as\s*Space\[\],\s*\/\/\s*Stubbed\s*for\s*Stage\s*6\s*create:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*update:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*delete:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*\}/g;

const spacesReplacement = `spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: Partial<Space>) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Space>) => fetchApi<Space>(\`/spaces/\${id}\`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(\`/spaces/\${id}\`, { method: 'DELETE' }),
  }`;
text = text.replace(spacesRegex, spacesReplacement);

// 2. Remove roadmapItems API
const roadmapRegex = /\s*roadmapItems:\s*\{\s*list:\s*async\s*\(\)\s*=>\s*\[\]\s*as\s*RoadmapItem\[\],\s*\/\/\s*Stubbed\s*for\s*Stage\s*6\s*create:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*update:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*delete:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*\},/g;
text = text.replace(roadmapRegex, '');

// 3. Remove snapshots API
const snapshotsRegex = /\s*snapshots:\s*\{\s*list:\s*async\s*\(\)\s*=>\s*\[\]\s*as\s*GoalProgressSnapshot\[\],\s*\/\/\s*Stubbed\s*create:\s*async\s*\(\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\},\s*\},/g;
text = text.replace(snapshotsRegex, '');

// 4. Fix decisions restore API
const restoreRegex = /restore:\s*async\s*\(_snapshot:\s*any\)\s*=>\s*\{\s*throw\s*new\s*Error\('Not\s*implemented\s*yet'\);\s*\}/g;
const restoreReplacement = "restore: (id: string) => fetchApi<{ success: boolean }>(`/decisions/${id}/restore`, { method: 'POST' })";
text = text.replace(restoreRegex, restoreReplacement);

fs.writeFileSync('apps/web/src/api/client.ts', text);
console.log("Done");
