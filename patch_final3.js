const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

const target = "  if (isLoading) {";
const replacement = `  const { user } = useAuth();
  const isGoogleConnected = !!(user?.metadata as any)?.googleRefreshToken;
  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
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

  const handleDisconnectGoogle = async () => {
    try {
      await api.oauth.disconnectGoogle();
      toast.success('Disconnected from Google Calendar');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    const handleSync = () => {
      const userStr = localStorage.getItem('auth-storage');
      let userId = 'system';
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          userId = parsed.state?.user?.id || 'system';
        } catch(e) {}
      }
      window.location.href = \`/api/v1/oauth/google/connect?userId=\${userId}\`;
    };
    
    const handleLocation = () => setLocationModalOpen(true);
    
    window.addEventListener('oauth-google-sync', handleSync);
    window.addEventListener('open-location-settings', handleLocation);
    
    return () => {
      window.removeEventListener('oauth-google-sync', handleSync);
      window.removeEventListener('open-location-settings', handleLocation);
    };
  }, []);

  if (isLoading) {`;

if (!text.includes('handleDisconnectGoogle')) {
    text = text.replace(target, replacement);
    fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
}
