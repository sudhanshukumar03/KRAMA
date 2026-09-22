import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  REDIS_URL: z.string().url(),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("❌ FATAL: Missing or invalid environment variables:");
  console.error(parsedEnv.error.format());
  process.exit(1);
}

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { socketService } from './services/socket.service';
import { redisService } from './services/redis.service';
import { ensureLocalUser } from './utils/bootstrap';
import './events/subscribers';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import spaceRoutes from './routes/space.routes';
import documentRoutes from './routes/document.routes';
import uploadRoutes from './routes/upload.routes';
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
import plannerRoutes from './routes/planner.routes';
import holidayRoutes from './routes/holiday.routes';
import searchRoutes from './routes/search.routes';

const app = express();

const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN
].filter(Boolean) as string[];

// Security Middlewares
app.use(helmet());
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow any localhost or 127.0.0.1 origin during development
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || /^chrome-extension:\/\//.test(origin) || allowedOrigins.includes(origin)) {
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
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/pages', pageRoutes);

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
app.use('/api/v1/planner/holidays', holidayRoutes);
app.use('/api/v1/planner', plannerRoutes);
app.use('/api/v1/search', searchRoutes);

app.use('/api/v1/spaces', spaceRoutes);
app.use('/api/v1', documentRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.use('/api/v1', (_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error Handler]:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    errors: err.errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
socketService.init(httpServer);

httpServer.listen(PORT, async () => {
  if (process.env.NODE_ENV !== 'test') {
    try {
      // Ensure Redis is actually connected before accepting traffic
      await redisService.ensureConnected();
    } catch (error) {
      console.error('[CRITICAL] Redis is not available on boot. Auth system requires Redis.', error);
      process.exit(1);
    }
  }
  await ensureLocalUser();
  console.log(`[Server] KRAMA OS Backend running on port ${PORT}`);
});

