import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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

  useEffect(() => {
    const token = localStorage.getItem('krama_token');
    if (!token) return;

    const cleanToken = token.replace(/^"(.*)"$/, '');

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

    socketInstance.on('automation:triggered', (data) => {
      toast.info('Automation Fired', { description: data.ruleName });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
