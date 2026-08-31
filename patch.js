const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

const target = `    const handleSync = () => {
      // For now, this is mocked as we deferred the real OAuth flow
      toast.info('Initiating Google Calendar Sync (Mock)');
      setTimeout(() => {
        toast.success('Successfully synced with Google Calendar');
      }, 1500);
    };`;

const replacement = `    const handleSync = () => {
      const userStr = localStorage.getItem('auth-storage');
      let userId = 'system';
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          userId = parsed.state?.user?.id || 'system';
        } catch(e) {}
      }
      
      window.location.href = \`/api/v1/oauth/google/connect?userId=\${userId}\`;
    };`;

text = text.replace(target, replacement);

const importTarget = "import { toast } from 'sonner';";
const importReplacement = "import { toast } from 'sonner';\nimport { useSearchParams } from 'react-router-dom';";
text = text.replace(importTarget, importReplacement);

const syncTarget = "    const handleSync = () => {";
const syncReplacement = `    const [searchParams, setSearchParams] = useSearchParams();
    
    useEffect(() => {
      if (searchParams.get('sync') === 'success') {
        toast.success('Successfully connected to Google Calendar');
        searchParams.delete('sync');
        setSearchParams(searchParams);
      } else if (searchParams.get('sync') === 'error') {
        toast.error('Google Calendar Sync Failed: ' + searchParams.get('message'));
        searchParams.delete('sync');
        searchParams.delete('message');
        setSearchParams(searchParams);
      }
    }, [searchParams, setSearchParams]);

    const handleSync = () => {`;

text = text.replace(syncTarget, syncReplacement);

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
