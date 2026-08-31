# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'const handleNavigate = \(dir: \'prev\' \| \'next\' \| \'today\'\) => \{'
replacement = '''const handleOAuthSync = async () => {
    try {
      toast.info('Connecting to Google Calendar...');
      await api.oauth.connectGoogle();
      toast.success('Successfully synced with Google Calendar (Mock)');
      refetch();
    } catch {
      toast.error('Failed to sync with Google Calendar');
    }
  };

  useEffect(() => {
    window.addEventListener('oauth-google-sync', handleOAuthSync as any);
    return () => window.removeEventListener('oauth-google-sync', handleOAuthSync as any);
  }, [refetch]);

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {'''

content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
