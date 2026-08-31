import { Router } from 'express';
import { googleCalendarService } from '../services/google-calendar.service';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';

const router: Router = Router();

router.get('/google/connect', (req: any, res: any) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send('userId is required');
  }
  const url = googleCalendarService.getAuthUrl(userId);
  res.redirect(url);
});

router.get('/google/callback', async (req: any, res: any) => {
  const { code, state } = req.query;
  const userId = state;
  if (!code || !userId) return res.status(400).send('Missing code or state (userId)');
  try {
    await googleCalendarService.handleCallback(code as string, userId as string);
    // Trigger an initial sync right away in the background
    try {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      await syncGoogleEvents(userId as string, start, end);
    } catch(e) {
      console.error('Initial background sync failed', e);
    }
    res.redirect('http://localhost:5173/app/planner?sync=success');
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error);
    res.redirect(http://localhost:5173/app/planner?sync=error&message=\);
  }
});

// Helper function to sync events to DB
async function syncGoogleEvents(userId: string, start: Date, end: Date) {
  const events = await googleCalendarService.fetchEvents(userId, start, end);
  
  for (const event of events) {
    if (!event.id) continue;
    
    const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : event.start?.date ? new Date(event.start.date) : null;
    const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : event.end?.date ? new Date(event.end.date) : null;
    if (!startTime || !endTime) continue;
    
    // Find if it exists in ExternalItem
    const extItem = await prisma.externalItem.findUnique({
      where: {
        provider_externalId_userId: { provider: 'google_calendar', externalId: event.id, userId }
      }
    });

    if (extItem) {
      // Update TimeBlock
      await prisma.timeBlock.update({
        where: { id: extItem.internalId },
        data: {
          title: event.summary || 'Busy',
          date: startTime,
          startTime: startTime,
          endTime: endTime,
        }
      });
      await prisma.externalItem.update({
        where: { id: extItem.id },
        data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' }
      });
    } else {
      // Create TimeBlock
      const tb = await prisma.timeBlock.create({
        data: {
          userId,
          title: event.summary || 'Busy',
          date: startTime,
          startTime: startTime,
          endTime: endTime,
          type: 'MEETING',
          syncStatus: 'SYNCED'
        }
      });
      // Create ExternalItem mapping
      await prisma.externalItem.create({
        data: {
          userId,
          provider: 'google_calendar',
          externalId: event.id,
          entityType: 'timeblock',
          internalId: tb.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date()
        }
      });
    }
  }
}

// Endpoint to manually sync
router.post('/google/sync', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    let { start, end } = req.body;
    
    if (!start) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString();
    }
    if (!end) {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      end = d.toISOString();
    }
    
    await syncGoogleEvents(userId, new Date(start), new Date(end));
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Fetch Google Events Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/google/disconnect', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
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
    
    // Optional: Delete all synced timeblocks?
    // We will leave them for now or mark them disconnected.
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Google Disconnect Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export { router as oauthRoutes };
