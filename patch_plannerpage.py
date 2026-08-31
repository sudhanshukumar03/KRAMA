with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

# 1. Add LocationSettingsModal import
if 'LocationSettingsModal' not in text:
    text = text.replace(
        "import { PlannerHeader } from './PlannerHeader';",
        "import { PlannerHeader } from './PlannerHeader';\nimport { LocationSettingsModal } from '../LocationSettingsModal';"
    )

# 2. Add useSearchParams
if 'useSearchParams' not in text:
    text = text.replace(
        "import { toast } from 'sonner';",
        "import { toast } from 'sonner';\nimport { useSearchParams } from 'react-router-dom';"
    )

# 3. Add locationModalOpen state
if 'locationModalOpen' not in text:
    text = text.replace(
        "const [captureOpen, setCaptureOpen] = useState(false);",
        "const [captureOpen, setCaptureOpen] = useState(false);\n  const [locationModalOpen, setLocationModalOpen] = useState(false);"
    )

# 4. Add the useEffect block for sync and location
if 'oauth-google-sync' not in text:
    target_hook = "  useEffect(() => {\n    if (data?.config?.focusMode) {"
    replacement_hook = """  const [searchParams, setSearchParams] = useSearchParams();
  
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

  useEffect(() => {
    const handleSync = () => {
      const userStr = localStorage.getItem('auth-storage');
      let userId = 'system';
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          userId = parsed.state?.user?.id || 'system';
        } catch(e) {}
      }
      window.location.href = `/api/v1/oauth/google/connect?userId=${userId}`;
    };
    
    const handleLocation = () => setLocationModalOpen(true);
    
    window.addEventListener('oauth-google-sync', handleSync);
    window.addEventListener('open-location-settings', handleLocation);
    
    return () => {
      window.removeEventListener('oauth-google-sync', handleSync);
      window.removeEventListener('open-location-settings', handleLocation);
    };
  }, []);

  useEffect(() => {
    if (data?.config?.focusMode) {"""
    text = text.replace(target_hook, replacement_hook)

# 5. Render LocationSettingsModal
if '<LocationSettingsModal' not in text:
    target_jsx = "<div className=\"p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20\">"
    replacement_jsx = """<div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">
      <LocationSettingsModal 
        open={locationModalOpen} 
        onClose={() => setLocationModalOpen(false)} 
        currentCountry={data?.config?.countryCode || 'IN'} 
        currentRegion={data?.config?.regionCode || ''} 
      />"""
    text = text.replace(target_jsx, replacement_jsx)

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
