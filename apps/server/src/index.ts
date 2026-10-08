import 'dotenv/config';
import crypto from 'node:crypto';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(48),
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
import { trustedProxyAddresses } from './config/proxy';

import { socketService } from './services/socket.service';
import { redisService } from './services/redis.service';
import { prisma } from './prisma';
import { ensureLocalUser, ensureVectorIndexes, ensureSearchVectorIndex } from './utils/bootstrap';
import './events/subscribers';
import './events/goalProgress.subscribers';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import spaceRoutes from './routes/space.routes';
import documentRoutes from './routes/document.routes';
import uploadRoutes from './routes/upload.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import goalRoutes from './routes/goal.routes';
import habitRoutes from './routes/habit.routes';
import aiRoutes from './routes/ai.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import focusSessionRoutes from './routes/focusSession.routes';
import analyticsRoutes from './routes/analytics.routes';
import plannerRoutes from './routes/planner.routes';
import holidayRoutes from './routes/holiday.routes';
import searchRoutes from './routes/search.routes';

const app = express();

// Direct deployments ignore forwarded IP headers. Reverse-proxy deployments
// explicitly identify trusted proxy addresses; never infer trust by hop count.
app.set('trust proxy', trustedProxyAddresses(process.env.TRUST_PROXY_CIDRS));

// CORS_ORIGIN may be a single origin or a comma-separated list; split so each
// entry is matched individually (includes() on the whole string never matches).
const corsEnvOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  ...corsEnvOrigins,
].filter(Boolean) as string[];

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-timezone', 'x-timezone-offset'],
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// Parsers
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Liveness: the HTTP process is running; dependencies may still be starting.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness remains separate from liveness. Share an in-flight dependency check
// so concurrent probes cannot enqueue an unbounded number of database queries.
let startupReady = false;
let readinessProbe: Promise<boolean> | null = null;
app.get('/ready', async (_req, res) => {
  if (!startupReady || redisService.client.status !== 'ready') {
    return res.status(503).json({ status: 'not_ready' });
  }
  if (!readinessProbe) {
    readinessProbe = Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redisService.client.ping(),
    ]).then(() => true, () => false).finally(() => { readinessProbe = null; });
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const ready = await Promise.race([
      readinessProbe,
      new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 1000); }),
    ]);
    return res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/ai', aiRoutes);
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
  const requestId = crypto.randomUUID();
  console.error(`[Global Error Handler] ${requestId}`, err);
  const requestedStatus = Number(err.status || err.statusCode || 500);
  const status = requestedStatus >= 400 && requestedStatus < 600 ? requestedStatus : 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(status).json({
    message: status >= 500 && !isDevelopment ? 'Internal server error' : (err.message || 'Internal server error'),
    ...(isDevelopment ? { errors: err.errors, stack: err.stack } : {}),
    requestId,
  });
});

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
socketService.init(httpServer);

httpServer.listen(PORT, async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await redisService.ensureConnected();
    }
    await prisma.$queryRaw`SELECT 1`;
    await ensureLocalUser();
    await ensureVectorIndexes();
    await ensureSearchVectorIndex();
    startupReady = true;
    console.log(`[Server] KRAMA OS Backend running on port ${PORT}`);
  } catch (error) {
    startupReady = false;
    console.error('[CRITICAL] Startup dependencies or initialization failed.', error);
    process.exit(1);
  }
});
