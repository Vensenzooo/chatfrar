export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  creator_name: string;
  members: GroupMember[];
}

export interface GroupMember extends User {
  is_admin: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: string;
  reply_to_id: string | null;
  reply_to?: Message;
  gemini_response?: string;
  image?: string | null;
  sender_id: string;
  receiver_id?: string | null;
  group_id?: string | null;
  created_at: string;
  is_deleted: boolean;
  is_read?: boolean;
  receiver?: User;
}

export interface GroupBan {
  user_id: string;
  group_id: string;
  banned_by: string;
  reason: string;
  created_at: string;
  user: User;
  banned_by_user: User;
} 