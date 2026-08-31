import re
with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

# 1. Add useAuth
if 'useAuth' not in text:
    text = text.replace(
        "import { useSearchParams } from 'react-router-dom';",
        "import { useSearchParams } from 'react-router-dom';\nimport { useAuth } from '../../contexts/AuthContext';"
    )

# 2. Extract user and check if connected
target_hook = "  const [searchParams, setSearchParams] = useSearchParams();"
replacement_hook = '''  const { user } = useAuth();
  const isGoogleConnected = !!(user?.metadata as any)?.googleRefreshToken;
  const [searchParams, setSearchParams] = useSearchParams();'''
if 'useAuth()' not in text:
    text = text.replace(target_hook, replacement_hook)

# 3. Add handleDisconnect
if 'handleDisconnectGoogle' not in text:
    target_handle = "  const handleSync = () => {"
    replacement_handle = '''  const handleDisconnectGoogle = async () => {
    try {
      const res = await fetch('/api/v1/oauth/google/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': Bearer 
        }
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success('Disconnected from Google Calendar');
      // A full reload or user object refetch is needed to update the UI
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSync = () => {'''
    text = text.replace(target_handle, replacement_handle)

# 4. Pass props to PlannerHeader
target_header = '''        <PlannerHeader
          mode={mode}
          onModeChange={setMode}
          title={headerTitle}
          subtitle={headerSubtitle}
          onNavigate={handleNavigate}
          syncStatus={data.syncStatus}
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          localOnly={localOnly}
          onLocalOnlyChange={setLocalOnly}
          countryRegion={countryRegionStr}'''
          
replacement_header = '''        <PlannerHeader
          mode={mode}
          onModeChange={setMode}
          title={headerTitle}
          subtitle={headerSubtitle}
          onNavigate={handleNavigate}
          syncStatus={data.syncStatus}
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          localOnly={localOnly}
          onLocalOnlyChange={setLocalOnly}
          countryRegion={countryRegionStr}
          isGoogleConnected={isGoogleConnected}
          onDisconnectGoogle={handleDisconnectGoogle}'''

if 'isGoogleConnected={isGoogleConnected}' not in text:
    text = text.replace(target_header, replacement_header)

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
