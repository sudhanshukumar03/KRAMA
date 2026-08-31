const fs = require('fs');
let sidebar = fs.readFileSync('apps/web/src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
    /import \{ useQuery \} from '@tanstack\/react-query';/g, 
    "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';"
);
fs.writeFileSync('apps/web/src/components/Sidebar.tsx', sidebar);
console.log('done');
