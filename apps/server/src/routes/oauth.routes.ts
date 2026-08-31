import { Router } from 'express';
import { googleCalendarService } from '../services/google-calendar.service';
import { requireAuth } from '../middlewares/auth.middleware';

const router: Router = Router();

// Endpoint to initiate the Google OAuth flow
router.get('/google/connect', (req: any, res: any) => {
  // In a real app we'd verify JWT from query param or session cookie.
  // For this local app, we'll extract from a query param since it's a redirect.
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send('userId is required');
  }
  
  const url = googleCalendarService.getAuthUrl(userId);
  res.redirect(url);
});

// Callback URL that Google redirects to
router.get('/google/callback', async (req: any, res: any) => {
  const { code, state } = req.query;
  const userId = state;
  
  if (!code || !userId) {
    return res.status(400).send('Missing code or state (userId)');
  }
  
  try {
    await googleCalendarService.handleCallback(code as string, userId as string);
    // Redirect back to the frontend Planner page with a success flag
    res.redirect('http://localhost:5173/app/planner?sync=success');
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error);
    res.redirect(`http://localhost:5173/app/planner?sync=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Endpoint to fetch events and store them in ExternalItem / TimeBlocks
router.get('/google/events', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;
    
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end dates' });
    
    const events = await googleCalendarService.fetchEvents(userId, new Date(start), new Date(end));
    
    // In a real implementation, we would map these to the `ExternalItem` and `TimeBlock` tables here.
    // For this tier, we just return them so the UI can render them.
    return res.json({ events });
  } catch (error: any) {
    console.error('Fetch Google Events Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export { router as oauthRoutes };
