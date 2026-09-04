import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jwt-simple';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  public init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', 
        methods: ['GET', 'POST']
      }
    });

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
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      console.log(`[Socket] User ${userId} connected (${socket.id})`);

      socket.on('disconnect', () => {
        const userSet = this.userSockets.get(userId);
        if (userSet) {
          userSet.delete(socket.id);
          if (userSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
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
    
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach(socketId => {
        this.io!.to(socketId).emit(event, data);
      });
    }
  }
}

export const socketService = new SocketService();
