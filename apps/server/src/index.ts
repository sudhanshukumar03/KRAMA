import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();

const app = express();
import { prisma } from './prisma';

const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN
].filter(Boolean) as string[];

import './events/subscribers';

// Security Middlewares
app.use(helmet());
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow any localhost or 127.0.0.1 origin during development
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// Parsers
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import pageRoutes from './routes/page.routes';
import goalRoutes from './routes/goal.routes';
import habitRoutes from './routes/habit.routes';
import sprintRoutes from './routes/sprint.routes';
import dailyLogRoutes from './routes/dailyLog.routes';
import aiRoutes from './routes/ai.routes';
import knowledgeGraphRoutes from './routes/knowledgeGraph.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import focusSessionRoutes from './routes/focusSession.routes';
import analyticsRoutes from './routes/analytics.routes';
import decisionRoutes from './routes/decision.routes';
import plannerRoutes from './routes/planner.routes';
import holidayRoutes from './routes/holiday.routes';
import searchRoutes from './routes/search.routes';
import oauthRoutes from './routes/oauth.routes';

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/oauth', oauthRoutes);

app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/sprints', sprintRoutes);
app.use('/api/v1/daily-logs', dailyLogRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/focus-sessions', focusSessionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/decisions', decisionRoutes);
app.use('/api/v1/planner/holidays', holidayRoutes);
app.use('/api/v1/planner', plannerRoutes);
app.use('/api/v1/oauth', oauthRoutes);
app.use('/api/v1/search', searchRoutes);

app.use('/api/v1', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    errors: err.errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 3000;

import { ensureLocalUser } from './utils/bootstrap';

app.listen(PORT, async () => {
  await ensureLocalUser();
  console.log(`[Server] KRAMA OS Backend running on port ${PORT}`);
});

