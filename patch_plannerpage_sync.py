with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

target1 = "  const [searchParams, setSearchParams] = useSearchParams();"
replacement1 = "  const [searchParams, setSearchParams] = useSearchParams();\n  const [isSyncingGoogle, setIsSyncingGoogle] = React.useState(false);"

if 'isSyncingGoogle' not in text:
    text = text.replace(target1, replacement1)

target2 = "  const handleDisconnectGoogle = async () => {"
replacement2 = '''  const handleSyncGoogleNow = async () => {
    try {
      setIsSyncingGoogle(true);
      await api.oauth.syncGoogle();
      toast.success('Calendar synced successfully');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {'''

if 'handleSyncGoogleNow' not in text:
    text = text.replace(target2, replacement2)

target3 = "onDisconnectGoogle={handleDisconnectGoogle}"
replacement3 = "onDisconnectGoogle={handleDisconnectGoogle}\n          onSyncGoogle={handleSyncGoogleNow}\n          isSyncingGoogle={isSyncingGoogle}"

if 'onSyncGoogle={handleSyncGoogleNow}' not in text:
    text = text.replace(target3, replacement3)

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
