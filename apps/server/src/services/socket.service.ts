import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jwt-simple';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { redisService } from './redis.service';
import { prisma } from '../prisma';

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
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.FRONTEND_URL,
      ...corsEnvOrigins,
    ].filter(Boolean) as string[];

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (
            !origin ||
            /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
            allowedOrigins.includes(origin)
          ) {
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
        // Mirror requireAuth: pin HS256, reject expired tokens, honor revocation.
        const decoded = jwt.decode(token, JWT_SECRET, false, 'HS256') as any;
        // exp is a NumericDate (seconds); compare against ms epoch.
        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          return next(new Error('Authentication error: Token expired'));
        }

        const sessionId = decoded.sessionId;
        if (!sessionId) return next(new Error('Authentication error: Session missing'));
        if (sessionId) {
          const cacheKey = `session_revoked:${sessionId}`;
          const cachedStatus = await redisService.get(cacheKey);
          if (cachedStatus === 'true') {
            return next(new Error('Authentication error: Session revoked'));
          } else if (cachedStatus !== 'false') {
            const dbSession = await prisma.session.findUnique({
              where: { id: sessionId },
              select: { revokedAt: true },
            });
            if (!dbSession || dbSession.revokedAt !== null) {
              await redisService.set(cacheKey, 'true', 3600);
              return next(new Error('Authentication error: Session revoked'));
            }
            await redisService.set(cacheKey, 'false', 300);
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
      const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { revokedAt: true } });
      if (!session || session.revokedAt || !socket.connected) {
        socket.emit('session:ended', { reason: 'revoked' });
        socket.disconnect(true);
        return;
      }
      if (userId) {
        socket.join(userId);
        // Join a room per workspace the user belongs to, so task/collaboration
        // events broadcast to the whole workspace reach every member — not just
        // the actor. Memberships rarely change mid-session; reconnect refreshes.
        try {
          const memberships = await prisma.workspaceMember.findMany({
            where: { userId, workspace: { deletedAt: null } },
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
        if (room && event) this.io?.to(room).emit(event, data);
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
  private emitToRoom(room: string, event: string, data: any) {
    if (this.io) {
      this.io.to(room).emit(event, data);
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
