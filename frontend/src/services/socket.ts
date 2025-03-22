import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

let socket: Socket | null = null;

export const initializeSocket = (userId: string) => {
  if (socket) return;

  socket = io('http://localhost:3000', {
    withCredentials: true,
    query: { userId }
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const isSocketConnected = () => {
  return socket?.connected || false;
};

export const joinChat = (roomId: string) => {
  if (!socket) return;
  socket.emit('join_chat', roomId);
};

export const leaveChat = (roomId: string) => {
  if (!socket) return;
  socket.emit('leave_chat', roomId);
};

export const onNewMessage = (callback: (message: Message) => void) => {
  if (!socket) return () => {};

  socket.on('new_message', callback);

  return () => {
    socket?.off('new_message', callback);
  };
};

export const onUserTyping = (callback: (data: { userId: string; chatId: string }) => void) => {
  if (!socket) return () => {};

  socket.on('user_typing', callback);

  return () => {
    socket?.off('user_typing', callback);
  };
};

export const emitTyping = (chatId: string) => {
  if (!socket) return;
  socket.emit('typing', chatId);
};

export const onUserOnline = (callback: (userId: string) => void) => {
  if (!socket) return () => {};

  socket.on('user_online', callback);

  return () => {
    socket?.off('user_online', callback);
  };
};

export const onUserOffline = (callback: (userId: string) => void) => {
  if (!socket) return () => {};

  socket.on('user_offline', callback);

  return () => {
    socket?.off('user_offline', callback);
  };
};

export const onMessageDeleted = (callback: (messageId: string) => void) => {
  if (!socket) return () => {};

  socket.on('message_deleted', callback);

  return () => {
    socket?.off('message_deleted', callback);
  };
}; 