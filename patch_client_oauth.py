with open('apps/server/src/routes/oauth.routes.ts', 'r') as f:
    text = f.read()

disconnect_route = '''
// Endpoint to disconnect Google Calendar
router.delete('/google/disconnect', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { prisma } = await import('../prisma');
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const metadata = (user.metadata as Record<string, any>) || {};
    delete metadata.googleRefreshToken;
    delete metadata.googleAccessToken;
    delete metadata.googleTokensExpiry;
    
    await prisma.user.update({
      where: { id: userId },
      data: { metadata }
    });
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Google Disconnect Error:', error);
    return res.status(500).json({ error: error.message });
  }
});
'''
if 'google/disconnect' not in text:
    text = text.replace('export { router as oauthRoutes };', disconnect_route + '\nexport { router as oauthRoutes };')
    with open('apps/server/src/routes/oauth.routes.ts', 'w') as f:
        f.write(text)
