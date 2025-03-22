import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { Message, User, Group, GroupBan } from '../types';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Users
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const searchUsers = async (query: string) => {
  const response = await api.get(`/users/search?q=${query}`);
  return response.data;
};

// Groups
export const getGroups = async (): Promise<Group[]> => {
  const response = await api.get('/groups');
  return response.data;
};

export const createGroup = async (name: string, memberIds: string[]): Promise<Group> => {
  const response = await api.post('/groups', { name, memberIds });
  return response.data;
};

export const addGroupMember = async (groupId: string, userId: string) => {
  const response = await api.post(`/groups/${groupId}/members`, { userId });
  return response.data;
};

export const banGroupMember = async (groupId: string, userId: string, reason: string) => {
  const response = await api.post(`/groups/${groupId}/ban`, { userId, reason });
  return response.data;
};

export const unbanGroupMember = async (groupId: string, userId: string) => {
  const response = await api.post(`/groups/${groupId}/unban`, { userId });
  return response.data;
};

export const promoteToAdmin = async (groupId: string, userId: string) => {
  const response = await api.post(`/groups/${groupId}/promote`, { userId });
  return response.data;
};

export const getBannedMembers = async (groupId: string): Promise<GroupBan[]> => {
  const response = await api.get(`/groups/${groupId}/banned`);
  return response.data;
};

// Messages
export const getChatMessages = async (userId: string): Promise<Message[]> => {
  const response = await api.get(`/messages/chat/${userId}`);
  return response.data;
};

export const getGroupMessages = async (groupId: string): Promise<Message[]> => {
  const response = await api.get(`/groups/${groupId}/messages`);
  return response.data;
};

export async function sendMessage(
  content: string,
  image: string | null,
  receiverId?: string | null,
  groupId?: string | null
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content,
          image,
          receiver_id: receiverId,
          group_id: groupId,
          created_at: new Date().toISOString(),
          is_deleted: false,
          is_read: false
        }
      ])
      .select(`
        *,
        sender:users!sender_id(*),
        receiver:users!receiver_id(*)
      `);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export const deleteMessage = async (messageId: string) => {
  const response = await api.delete(`/messages/${messageId}`);
  return response.data;
};

export const getUnreadCounts = async () => {
  const response = await api.get('/messages/unread');
  return response.data;
};

export const resetUnreadCount = async (senderId: string) => {
  const response = await api.post(`/messages/unread/${senderId}/reset`);
  return response.data;
};

export const getRecentChats = async (): Promise<User[]> => {
  const response = await api.get('/messages/recent');
  return response.data;
}; 