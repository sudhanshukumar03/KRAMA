import { google } from 'googleapis';
import { prisma } from '../prisma';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
  process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/oauth/google/callback'
);

export const googleCalendarService = {
  getAuthUrl(userId: string) {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: userId, // Pass userId so we know who is connecting
    });
  },

  async handleCallback(code: string, userId: string) {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store refresh token in user metadata
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    
    const metadata = (user.metadata as Record<string, any>) || {};
    metadata.googleRefreshToken = tokens.refresh_token || metadata.googleRefreshToken;
    metadata.googleAccessToken = tokens.access_token;
    metadata.googleTokensExpiry = tokens.expiry_date;
    
    await prisma.user.update({
      where: { id: userId },
      data: { metadata }
    });
    
    return tokens;
  },

  async fetchEvents(userId: string, timeMin: Date, timeMax: Date) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    
    const metadata = (user.metadata as Record<string, any>) || {};
    if (!metadata.googleRefreshToken && !metadata.googleAccessToken) {
      throw new Error('Google Calendar not connected');
    }
    
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    client.setCredentials({
      access_token: metadata.googleAccessToken,
      refresh_token: metadata.googleRefreshToken,
      expiry_date: metadata.googleTokensExpiry
    });
    
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return res.data.items || [];
  }
};
