import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

let socket: Socket | null = null;

export function initializeSocket(userId: string) {
  if (socket) return socket;

  socket = io('http://localhost:3000', {
    auth: { userId },
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
    socket?.emit('user:online', userId);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChat(chatId: string) {
  socket?.emit('chat:join', chatId);
}

export function leaveChat(chatId: string) {
  socket?.emit('chat:leave', chatId);
}

export function sendChatMessage(message: Partial<Message>) {
  socket?.emit('message:send', message);
}

export function onNewMessage(callback: (message: Message) => void) {
  socket?.on('message:new', callback);
}

export function onUserTyping(callback: (data: { userId: string, chatId: string }) => void) {
  socket?.on('user:typing', callback);
}

export function emitTyping(chatId: string) {
  socket?.emit('user:typing', { chatId });
}

export function onUserOnline(callback: (userId: string) => void) {
  socket?.on('user:online', callback);
}

export function onUserOffline(callback: (userId: string) => void) {
  socket?.on('user:offline', callback);
}