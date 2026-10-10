import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jwt-simple';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { redisService } from './redis.service';
import { prisma } from '../prisma';
import { WORKSPACE_READ_ROLES } from '../middlewares/rbac.middleware';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Cross-process socket delivery channel. BullMQ workers run in a separate
// process with no initialized Socket.IO server, so they cannot emit directly.
// They publish here instead; the server process (which owns `io`) subscribes
// and performs the actual emit.
const EMIT_CHANNEL = process.env.KRAMA_TEST_RUN_ID ? `socket:emit:test:${process.env.KRAMA_TEST_RUN_ID}` : 'socket:emit';

class SocketService {
  private io: SocketIOServer | null = null;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private adapterClients: Redis[] = [];

  public init(httpServer: HttpServer) {
    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing.');
    }
    const JWT_SECRET = process.env.JWT_SECRET;

    // Mirror the HTTP CORS policy in index.ts: allow any localhost/127.0.0.1
    // port in dev, plus the configured origins
    // (CORS_ORIGIN may be a comma-separated list).
    const corsEnvOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      ...corsEnvOrigins,
    ].filter(Boolean) as string[];
    const isOriginAllowed = (origin: string | undefined) => !origin ||
      (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) ||
      allowedOrigins.includes(origin);

    this.io = new SocketIOServer(httpServer, {
      // Browser CORS covers polling; apply the same rule to WebSocket upgrades.
      allowRequest: (request, callback) => callback(null, isOriginAllowed(request.headers.origin)),
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      }
    });

    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    this.adapterClients = [pubClient, subClient];
    this.io.adapter(createAdapter(pubClient, subClient));

    this.io.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      try {
        // Mirror requireAuth: pin HS256, reject expired tokens, and verify
        // shared revocation state plus authoritative session ownership.
        const decoded = jwt.decode(token, JWT_SECRET, false, 'HS256') as any;
        // exp is a NumericDate (seconds); compare against ms epoch.
        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          return next(new Error('Authentication error: Token expired'));
        }

        const sessionId = decoded.sessionId;
        const userId = decoded.sub;
        if (typeof sessionId !== 'string' || !sessionId || typeof userId !== 'string' || !userId) {
          return next(new Error('Authentication error: Session missing'));
        }
        if (sessionId) {
          const cacheKey = `session_revoked:${sessionId}`;
          const cachedStatus = await redisService.getShared(cacheKey);
          if (cachedStatus === 'true') {
            return next(new Error('Authentication error: Session revoked'));
          } else {
            const dbSession = await prisma.session.findUnique({
              where: { id: sessionId },
              select: { userId: true, revokedAt: true },
            });
            if (!dbSession || dbSession.userId !== userId || dbSession.revokedAt !== null) {
              await redisService.set(cacheKey, 'true', 3600);
              return next(new Error('Authentication error: Session revoked'));
            }
          }
        }

        (socket as any).user = { ...decoded, id: decoded.sub || decoded.id };
        next();
      } catch {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', async (socket: Socket) => {
      const userId = (socket as any).user.id || (socket as any).user.sub;
      const { sessionId, exp } = (socket as any).user;
      await socket.join(`session:${sessionId}`);
      const expires = setTimeout(() => {
        socket.emit('session:ended', { reason: 'expired' });
        socket.disconnect(true);
      }, Math.max(0, exp * 1000 - Date.now()));
      socket.on('disconnect', () => clearTimeout(expires));
      // A logout may have committed between the handshake check and room join.
      const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true, revokedAt: true } });
      if (!session || session.userId !== userId || session.revokedAt || !socket.connected) {
        socket.emit('session:ended', { reason: 'revoked' });
        socket.disconnect(true);
        return;
      }
      if (userId) {
        socket.join(userId);
        // Join readable workspaces; event delivery rechecks current membership.
        try {
          const memberships = await prisma.workspaceMember.findMany({
            where: { userId, workspace: { deletedAt: null }, role: { in: [...WORKSPACE_READ_ROLES] } },
            select: { workspaceId: true },
          });
          for (const m of memberships) {
            if (socket.connected) await socket.join(`workspace:${m.workspaceId}`);
          }
        } catch (err) {
          console.warn('[Socket] Could not join workspace rooms:', (err as any)?.message || err);
        }
      }
      console.log(`[Socket] User ${userId} connected (${socket.id})`);

      socket.on('disconnect', () => {
        clearTimeout(expires);
        console.log(`[Socket] User ${userId} disconnected (${socket.id})`);
      });
    });

    // Deliver events published by other processes (e.g. BullMQ workers).
    this.subscriber = new Redis(REDIS_URL);
    this.subscriber.subscribe(EMIT_CHANNEL).catch((err) => {
      console.warn('[Socket] Could not subscribe to emit channel:', err?.message || err);
    });
    this.subscriber.on('message', (_channel, raw) => {
      try {
        const { room, event, data } = JSON.parse(raw);
        if (typeof room === 'string' && typeof event === 'string') this.emitToRoom(room, event, data);
      } catch {
        // Ignore malformed cross-process payloads.
      }
    });
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized!');
    }
    return this.io;
  }

  public revokeSessionConnections(sessionId: string, reason: 'revoked' | 'rotated' = 'revoked') {
    const room = `session:${sessionId}`;
    this.io?.to(room).emit('session:ended', { reason });
    // The Redis adapter distributes this disconnect across all server instances.
    this.io?.in(room).disconnectSockets(true);
  }

  public disconnectWorkspace(workspaceId: string) {
    this.io?.in(`workspace:${workspaceId}`).socketsLeave(`workspace:${workspaceId}`);
  }

  public async shutdown() {
    if (this.io) await new Promise<void>(resolve => this.io!.close(() => resolve()));
    await Promise.all([this.publisher?.quit(), this.subscriber?.quit()]);
    await Promise.all(this.adapterClients.map(client => client.quit()));
    this.adapterClients = [];
    this.io = null;
    this.publisher = null;
    this.subscriber = null;
  }

  // Emit to a Socket.IO room. In the server process, emit directly. In a worker
  // process (no `io`), publish over Redis so the server process delivers it —
  // otherwise the event is silently dropped.
  private async emitToReadableWorkspace(workspaceId: string, event: string, data: any) {
    // Resolve recipients for every event, including worker delivery through Redis.
    // Stale workspace rooms cannot retain access after a membership change.
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, workspace: { deletedAt: null }, role: { in: [...WORKSPACE_READ_ROLES] } },
      select: { userId: true },
    });
    const rooms = [...new Set(members.map(member => member.userId))];
    if (rooms.length) this.io?.to(rooms).emit(event, data);
  }

  private emitToRoom(room: string, event: string, data: any) {
    if (this.io) {
      if (room.startsWith('workspace:')) {
        void this.emitToReadableWorkspace(room.slice('workspace:'.length), event, data)
          .catch(err => console.warn('[Socket] Workspace authorization failed; event withheld:', err));
      } else {
        this.io.to(room).emit(event, data);
      }
      return;
    }
    if (!this.publisher) this.publisher = new Redis(REDIS_URL);
    this.publisher
      .publish(EMIT_CHANNEL, JSON.stringify({ room, event, data }))
      .catch(() => { /* Redis offline: nothing to deliver to anyway. */ });
  }

  public emitToUser(userId: string, event: string, data: any) {
    this.emitToRoom(userId, event, data);
  }

  public emitToWorkspace(workspaceId: string, event: string, data: any) {
    this.emitToRoom(`workspace:${workspaceId}`, event, data);
  }
}

export const socketService = new SocketService();
