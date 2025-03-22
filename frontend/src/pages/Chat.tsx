import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Settings } from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { Avatar } from '../components/Avatar';
import { UserSearch } from '../components/UserSearch';
import { Message, User, Group } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useMessagePolling } from '../hooks/useMessagePolling';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  banGroupMember,
  unbanGroupMember,
  getRecentChats,
  getBannedMembers,
  getUnreadCounts,
  resetUnreadCount,
  getGroups, 
  createGroup, 
  sendMessage, 
  supabase,
  promoteToAdmin
} from '../services/api';
import { 
  initializeSocket, 
  disconnectSocket, 
  joinChat, 
  leaveChat, 
  onNewMessage,
  onUserTyping,
  emitTyping,
  onUserOnline,
  onUserOffline,
  onMessageDeleted,
  isSocketConnected
} from '../services/socket';
import { getGeminiResponse } from '../services/gemini';

// Define GEMINI_USER locally since import is causing issues
const GEMINI_USER: User = {
  id: 'gemini',
  username: 'Gemini',
  email: 'gemini@google.com',
  avatar: 'https://www.google.com/favicon.ico'
};

const isGroup = (chat: User | Group): chat is Group => {
  return 'members' in chat;
};

export function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | Group | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [bannedMembers, setBannedMembers] = useState<any[]>([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [selectedMemberToBan, setSelectedMemberToBan] = useState<User | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [initialized, setInitialized] = useState(false);
  const messageSubscription = useRef<any>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGeminiThinking, setIsGeminiThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, image: File | null = null) => {
    if (!selectedChat) return;

    const imageUrl = image ? await uploadImage(image) : null;
    const receiverId = isGroup(selectedChat) ? null : selectedChat.id;
    const groupId = isGroup(selectedChat) ? selectedChat.id : null;

    const tempMessage: Message = {
      id: Date.now().toString(),
      content,
      image: typeof imageUrl === 'string' ? imageUrl : undefined,
      sender_id: 'current_user_id',
      receiver_id: receiverId,
      group_id: groupId,
      created_at: new Date().toISOString(),
      sender: { id: 'current_user_id', username: 'You', email: 'you@example.com', avatar: '' },
      timestamp: new Date().toISOString(),
      reply_to_id: null,
      is_deleted: false,
      is_read: false
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const newMessages = await sendMessage(content, imageUrl, receiverId, groupId);
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? newMessages[0] : msg
      ));

      if (content.toLowerCase().includes('@gemini')) {
        const response = await getGeminiResponse(content, messages);
        if (response) {
          const geminiMessage: Message = {
            id: Date.now().toString(),
            content: response,
            sender_id: GEMINI_USER.id,
            receiver_id: receiverId,
            group_id: groupId,
            created_at: new Date().toISOString(),
            sender: GEMINI_USER,
            timestamp: new Date().toISOString(),
            reply_to_id: null,
            is_deleted: false,
            is_read: false
          };
          setMessages(prev => [...prev, geminiMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const handleMessageUpdate = async (messageId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      ));
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleReply = (message: Message) => {
    // Implement reply functionality
  };

  const handleTyping = (isTyping: boolean) => {
    setIsTyping(isTyping);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: isGroup(selectedChat)
            ? `group_id=eq.${selectedChat.id}`
            : `or(and(sender_id=eq.${currentUser.id},receiver_id=eq.${selectedChat.id}),and(sender_id=eq.${selectedChat.id},receiver_id=eq.${currentUser.id}))`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    messageSubscription.current = channel;

    return () => {
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current);
      }
    };
  }, [selectedChat, currentUser]);

  // Set up message polling
  useMessagePolling(
    selectedChat?.id || null,
    selectedChat ? isGroup(selectedChat) : false,
    currentUser?.id || null,
    (newMessages) => {
      setMessages((prev) => {
        // Create a map of existing messages
        const existingMessages = new Map(prev.map(m => [m.id, m]));
        
        // Add only new messages
        newMessages.forEach(message => {
          if (!existingMessages.has(message.id)) {
            existingMessages.set(message.id, message);
          }
        });
        
        return Array.from(existingMessages.values())
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    }
  );

  return (
    <div className="flex h-screen">
      {/* ... existing sidebar code ... */}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* ... existing chat header code ... */}
            
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onUpdate={() => handleMessageUpdate(message.id, message.content)}
                  onReply={() => handleReply(message)}
                />
              ))}
              {isGeminiThinking && (
                <div className="flex items-center gap-2 text-slate-400 mt-4">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <span>Gemini réfléchit...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className="p-4 bg-gray-100 border-t">
                <p className="text-sm text-gray-500">
                  Replying to: <span className="font-medium">{replyingTo.content}</span>
                </p>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            <ChatInput
              onSend={handleSendMessage}
              onTyping={setIsTyping}
            />

            {/* ... existing typing indicator code ... */}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>

      {/* ... existing modals code ... */}
    </div>
  );
} 