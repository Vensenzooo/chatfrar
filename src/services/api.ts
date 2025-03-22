import { createClient } from '@supabase/supabase-js';
import { Message } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function signUp(email: string, password: string, username: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Create user profile
  const { error: profileError } = await supabase.from('users').upsert([{
      id: authData.user?.id,
      username,
      email,
      avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${encodeURIComponent(username)}`,
    }]);

  if (profileError) throw profileError;

  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    if (error.message === 'Invalid login credentials') {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
  
  return data;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    // Create profile if it doesn't exist
    const { data: newProfile, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        username: user.user_metadata.username || user.email?.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${encodeURIComponent(user.email || '')}`
      })
      .select()
      .single();
    
    if (error) throw error;
    return newProfile;
  }
  
  return data;
}

export async function getRecentChats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .rpc('get_recent_chats', { user_id: user.id });
  
  if (error) throw error;
  return data || [];
}

export async function getUnreadCounts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('unread_messages')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
}

export async function resetUnreadCount(senderId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .rpc('reset_unread_count', {
      p_user_id: user.id,
      p_sender_id: senderId
    });

  if (error) throw error;
}

export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

export async function createGroup(name: string, memberIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Remove duplicates and creator from memberIds
  const uniqueMembers = Array.from(new Set(memberIds)).filter(id => id !== user.id);
  
  // Start a transaction using RPC
  const { data: group, error: groupError } = await supabase
    .rpc('create_group', {
      group_name: name,
      creator_id: user.id,
      member_ids: [user.id, ...uniqueMembers]
    });
  
  if (groupError) throw groupError;
  return group;
}

export async function getGroups() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      members:group_members!inner(
        user:users!inner(*)
      )`
    )
    .eq('group_members.user_id', user.id);

  if (error) throw error;
  return data || [];
}

export async function addGroupMember(groupId: string, memberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('add_group_member', {
      group_id: groupId,
      member_id: memberId,
      admin_id: user.id
    });

  if (error) throw error;
  return data;
}

export async function removeGroupMember(groupId: string, memberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('remove_group_member', {
      group_id: groupId,
      member_id: memberId,
      admin_id: user.id
    });

  if (error) throw error;
  return data;
}

export async function promoteToAdmin(groupId: string, memberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('promote_to_admin', {
      group_id: groupId,
      member_id: memberId,
      admin_id: user.id
    });

  if (error) throw error;
  return data;
}

export async function banGroupMember(groupId: string, memberId: string, reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('ban_group_member', {
      group_id: groupId,
      member_id: memberId,
      admin_id: user.id,
      ban_reason: reason
    });

  if (error) throw error;
  return data;
}

export async function unbanGroupMember(groupId: string, memberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('unban_group_member', {
      group_id: groupId,
      member_id: memberId,
      admin_id: user.id
    });

  if (error) throw error;
  return data;
}

export async function getBannedMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_bans')
    .select(`
      *,
      user:users!user_id(*),
      banned_by:users!banned_by(*)
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data;
}

export async function uploadFile(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('message-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('message-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function sendMessage(
  content: string,
  image: File | null,
  receiverId?: string,
  groupId?: string
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let imageUrl = null;
    
    if (image) {
      imageUrl = await uploadFile(image);
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content,
          sender_id: user.id,
          receiver_id: receiverId,
          group_id: groupId,
          image: imageUrl
        }
      ])
      .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function editMessage(messageId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('edit_message', {
      message_id: messageId,
      new_content: content,
      user_id: user.id
    });

  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('delete_message', {
      message_id: messageId,
      user_id: user.id
    });

  if (error) throw error;
  return data;
}