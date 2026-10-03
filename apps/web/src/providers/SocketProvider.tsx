import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { SocketContext } from '../hooks/useSocket';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  useEffect(() => {
    const rawToken = accessToken;
    if (!rawToken) return;

    const cleanToken = rawToken.replace(/^"(.*)"$/, '$1');

    const socketInstance = io('/', {
      auth: { token: cleanToken },
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('Real-time connection established');
      setIsConnected(true);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    });

    socketInstance.on('disconnect', () => {
      console.log('Real-time connection lost');
      setIsConnected(false);
    });

    socketInstance.on('notification', (data) => {
      // Surface server-pushed event as a transient toast (no persistent notification store)
      toast(data.title, { description: data.message });
    });

    const invalidateTasksAndGoals = () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    };

    socketInstance.on('task:updated', invalidateTasksAndGoals);
    socketInstance.on('task:created', invalidateTasksAndGoals);
    socketInstance.on('task:deleted', invalidateTasksAndGoals);

    const invalidateProjectsAndGoals = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    socketInstance.on('project:created', invalidateProjectsAndGoals);
    socketInstance.on('project:updated', invalidateProjectsAndGoals);
    socketInstance.on('project:deleted', invalidateProjectsAndGoals);
    socketInstance.on('project:restored', invalidateProjectsAndGoals);

    const invalidateHabitsAndGoals = () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    socketInstance.on('habit:created', invalidateHabitsAndGoals);
    socketInstance.on('habit:updated', invalidateHabitsAndGoals);
    socketInstance.on('habit:deleted', invalidateHabitsAndGoals);
    socketInstance.on('habit:logged', invalidateHabitsAndGoals);
    socketInstance.on('habit:unlogged', invalidateHabitsAndGoals);
    socketInstance.on('habit:restored', invalidateHabitsAndGoals);

    const invalidateGoals = (data?: { goalId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data?.goalId) {
        queryClient.invalidateQueries({ queryKey: ['goal', data.goalId] });
      }
    };

    socketInstance.on('goal:created', invalidateGoals);
    socketInstance.on('goal:updated', invalidateGoals);
    socketInstance.on('goal:deleted', invalidateGoals);
    socketInstance.on('goal:restored', invalidateGoals);

    socketInstance.on('focus:session:completed', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
