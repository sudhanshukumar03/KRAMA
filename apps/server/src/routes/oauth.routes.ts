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
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Google Calendar Connected - Krama OS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #090d16;
      color: #f8fafc;
      text-align: center;
    }
    .card {
      background: #111827;
      padding: 2.5rem 2rem;
      border-radius: 1.25rem;
      border: 1px solid #1f2937;
      max-width: 360px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      width: 54px;
      height: 54px;
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 26px;
      font-weight: bold;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓</div>
    <h2>Google Calendar Connected</h2>
    <p>Your calendar has been linked and synced with Krama. Returning to your planner...</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS' }, '*');
        setTimeout(function() { window.close(); }, 1200);
      } else {
        setTimeout(function() { window.location.href = 'http://localhost:5173/app/planner?sync=success'; }, 1500);
      }
    } catch(e) {
      setTimeout(function() { window.location.href = 'http://localhost:5173/app/planner?sync=success'; }, 1500);
    }
  </script>
</body>
</html>
    `;
    return res.send(successHtml);
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error);
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Connection Failed - Krama OS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #090d16;
      color: #f8fafc;
      text-align: center;
    }
    .card {
      background: #111827;
      padding: 2.5rem 2rem;
      border-radius: 1.25rem;
      border: 1px solid #ef4444;
      max-width: 360px;
    }
    .badge {
      width: 54px;
      height: 54px;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 26px;
      font-weight: bold;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
    }
    p {
      margin: 0 0 1.25rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }
    button {
      background: #1f2937;
      color: #f8fafc;
      border: 1px solid #374151;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✕</div>
    <h2>Connection Failed</h2>
    <p>${error?.message || 'Unable to connect Google Calendar'}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', message: ${JSON.stringify(error?.message || 'Connection failed')} }, '*');
      }
    } catch(e) {}
  </script>
</body>
</html>
    `;
    return res.status(500).send(errorHtml);
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
