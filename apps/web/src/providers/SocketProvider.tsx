import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  useEffect(() => {
    const rawToken = accessToken || localStorage.getItem('krama_token');
    if (!rawToken) return;

    const cleanToken = rawToken.replace(/^"(.*)"$/, '');

    const socketInstance = io('/', {
      auth: { token: cleanToken },
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('Real-time connection established');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Real-time connection lost');
      setIsConnected(false);
    });

    socketInstance.on('notification', (data) => {
      toast(data.title, { description: data.message });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socketInstance.on('task:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    socketInstance.on('focus:session:completed', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient, accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
