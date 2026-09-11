import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jwt-simple';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class SocketService {
  private io: SocketIOServer | null = null;

  public init(httpServer: HttpServer) {
    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing.');
    }
    const JWT_SECRET = process.env.JWT_SECRET;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173', 
        methods: ['GET', 'POST']
      }
    });

    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      try {
        const decoded = jwt.decode(token, JWT_SECRET) as any;
        (socket as any).user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).user.id;
      
      socket.join(userId);
      console.log(`[Socket] User ${userId} connected (${socket.id})`);

      socket.on('disconnect', () => {
        console.log(`[Socket] User ${userId} disconnected (${socket.id})`);
      });
    });
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized!');
    }
    return this.io;
  }

  public emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(userId).emit(event, data);
  }
}

export const socketService = new SocketService();
