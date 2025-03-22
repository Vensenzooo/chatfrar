import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Settings } from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { Avatar } from '../components/Avatar';
import { UserSearch } from '../components/UserSearch';
import { Message, User, Group } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useMessagePolling } from '../hooks/useMessagePolling';
import { getGeminiResponse } from '../services/gemini';
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
  sendChatMessage, 
  onNewMessage,
  onUserTyping,
  emitTyping,
  onUserOnline,
  onUserOffline
} from '../services/socket';

// Define GEMINI_USER locally since import is causing issues
const GEMINI_USER: User = {
  id: 'gemini',
  username: 'Gemini AI',
  email: 'gemini@chatfrar.com',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gemini&backgroundColor=7977e8'
};

const Chat = () => {
  const { user, signOut } = useAuth();
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadGroups = useCallback(async () => {
    try {
      const groupsData = await getGroups();
      setGroups(groupsData);
      
      // Load recent chats
      const recentChats = await getRecentChats();
      setContacts(recentChats);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, []);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const counts = await getUnreadCounts();
      const countsMap = counts.reduce((acc, curr) => ({
        ...acc,
        [curr.sender_id]: curr.count
      }), {});
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (!user) return;
    setInitialized(true);
    loadGroups();
    loadUnreadCounts();
  }, [user, loadGroups, loadUnreadCounts]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;
    
    initializeSocket(user.id);
    
    // Set up socket event listeners
    onNewMessage((message) => {
      // Only add message if it's for the current chat
      if (selectedChat && (
        (isGroup(selectedChat) && message.group_id === selectedChat.id) ||
        (!isGroup(selectedChat) && (
          (message.sender_id === selectedChat.id && message.receiver_id === user.id) ||
          (message.sender_id === user.id && message.receiver_id === selectedChat.id)
        ))
      )) {
        setMessages(prev => {
          // Avoid duplicate messages
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });
    
    onUserTyping(({ userId, chatId }) => {
      if (userId === user.id) return;
      
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: chatId
      }));
      
      // Clear typing indicator after 3 seconds
      if (typingTimeoutRef.current[userId]) {
        clearTimeout(typingTimeoutRef.current[userId]);
      }
      
      typingTimeoutRef.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }, 3000);
    });
    
    onUserOnline((userId) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });
    
    onUserOffline((userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });
    
    return () => {
      disconnectSocket();
    };
  }, [user, selectedChat]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!selectedChat || !user) return;

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
            : `or(and(sender_id=eq.${user.id},receiver_id=eq.${selectedChat.id}),and(sender_id=eq.${selectedChat.id},receiver_id=eq.${user.id}))`
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
  }, [selectedChat, user]);

  // Join/leave chat rooms when selected chat changes
  useEffect(() => {
    if (!selectedChat || !user) return;
    
    const chatId = isGroup(selectedChat) ? selectedChat.id : `dm_${user.id}_${selectedChat.id}`;
    joinChat(chatId);
    
    return () => {
      leaveChat(chatId);
    };
  }, [selectedChat, user]);

  // Set up message polling
  useMessagePolling(
    selectedChat?.id || null,
    selectedChat ? isGroup(selectedChat) : false,
    user?.id || null,
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

  const handleSendMessage = async (content: string, image?: File | null) => {
    if (!user || !selectedChat) return;
    
    try {
      // Vérifier si le message contient @gemini
      if (content.includes('@gemini')) {
        // Créer un message temporaire pour l'affichage immédiat
        const tempMessage: Message = {
          id: Date.now().toString(),
          content,
          sender_id: user.id,
          receiver_id: isGroup(selectedChat) ? undefined : selectedChat.id,
          group_id: isGroup(selectedChat) ? selectedChat.id : undefined,
          created_at: new Date().toISOString(),
          sender: user,
          is_deleted: false,
          timestamp: new Date().toISOString(),
          reply_to_id: null
        };

        // Ajouter le message temporaire
        setMessages(prev => [...prev, tempMessage]);

        // Obtenir la réponse de Gemini
        const geminiResponse = await getGeminiResponse(content, messages);
        
        if (geminiResponse) {
          // Créer le message de réponse de Gemini
          const geminiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: geminiResponse,
            sender_id: GEMINI_USER.id,
            receiver_id: isGroup(selectedChat) ? undefined : user.id,
            group_id: isGroup(selectedChat) ? selectedChat.id : undefined,
            created_at: new Date().toISOString(),
            sender: GEMINI_USER,
            is_deleted: false,
            timestamp: new Date().toISOString(),
            reply_to_id: tempMessage.id
          };

          // Ajouter la réponse de Gemini
          setMessages(prev => [...prev, geminiMessage]);
        }
      } else {
        // Envoyer le message normal
        const message = await sendMessage(
          content,
          image || null,
          isGroup(selectedChat) ? undefined : selectedChat.id,
          isGroup(selectedChat) ? selectedChat.id : undefined
        );
        
        if (message) {
          sendChatMessage(message);
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!selectedChat || !user) return;
    
    const chatId = isGroup(selectedChat) ? selectedChat.id : `dm_${user.id}_${selectedChat.id}`;
    emitTyping(chatId);
  };

  // Load messages for selected chat
  const loadMessages = useCallback(async (chatId: string, isGroup: boolean) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
        .or(isGroup 
          ? `group_id.eq.${chatId}` 
          : `and(sender_id.eq.${user?.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true })
        .not('is_deleted', 'eq', true)
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user?.id]);

  const handleMessageUpdate = useCallback(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id, isGroup(selectedChat));
    }
  }, [selectedChat, loadMessages]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    try {
      await createGroup(
        newGroupName,
        selectedMembers.map(member => member.id)
      );
      await loadGroups();
      setNewGroupName('');
      setSelectedMembers([]);
      setShowGroupModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Render method
  if (user === null || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access the chat</p>
        </div>
      </div>
    );
  }

  const handleChatSelect = async (chat: User | Group) => {
    setSelectedChat(chat);
    setMessages([]);
    
    const chatId = chat.id;
    const isGroupChat = isGroup(chat);
    
    // Load messages immediately
    await loadMessages(chatId, isGroupChat);
    
    // Reset unread count for direct messages
    if (!isGroupChat) {
      try {
        await resetUnreadCount(chat.id);
        setUnreadCounts(prev => ({ ...prev, [chat.id]: 0 }));
      } catch (error) {
        console.error('Error resetting unread count:', error);
      }
    }
    
    // Join the chat room
    const roomId = isGroupChat ? chatId : `dm_${user?.id}_${chatId}`;
    joinChat(roomId);
  };

  const handleAddContact = (user: User) => {
    if (user.id === user?.id) return;
    
    if (!contacts.find(c => c.id === user.id)) {
      setContacts(prev => {
        // Avoid duplicates
        if (prev.some(c => c.id === user.id)) {
          return prev;
        }
        return [user, ...prev];
      });
      handleChatSelect(user);
      setSearchOpen(false);
    }
  };

  const handleBanMember = async (member: User) => {
    if (!selectedChat || !isGroup(selectedChat)) return;
    
    try {
      await banGroupMember(selectedChat.id, member.id, banReason);
      setShowBanModal(false);
      setBanReason('');
      setSelectedMemberToBan(null);
      loadGroups();
    } catch (error) {
      console.error('Error banning member:', error);
    }
  };

  const handleUnbanMember = async (memberId: string) => {
    if (!selectedChat || !isGroup(selectedChat)) return;
    
    try {
      await unbanGroupMember(selectedChat.id, memberId);
      const updatedBans = await getBannedMembers(selectedChat.id);
      setBannedMembers(updatedBans);
    } catch (error) {
      console.error('Error unbanning member:', error);
    }
  }

  // Render method
  return (
    <div className="flex h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-violet-100 flex flex-col shadow-lg">
        <div className="p-4 border-b border-violet-100 bg-gradient-to-r from-violet-100/50 to-fuchsia-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="focus:outline-none transform transition-all duration-200 hover:scale-105 hover:opacity-75"
                title="Se déconnecter"
              >
                <Avatar user={user} />
              </button>
              <div className="overflow-hidden">
                <h3 className="font-semibold text-gray-800">{user.username}</h3>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-violet-100/50 rounded-full transition-colors duration-200"
            >
              <Plus className="w-5 h-5 text-violet-600" />
            </button>
          </div>
          {searchOpen && (
            <div className="mt-4">
              <UserSearch
                onSelectUser={(user) => {
                  handleAddContact(user);
                  setSearchOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-violet-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Groupes</h2>
              <button 
                onClick={() => setShowGroupModal(true)}
                className="p-1 hover:bg-violet-100/50 rounded-full transition-colors duration-200"
              >
                <Plus className="w-5 h-5 text-violet-600" />
              </button>
            </div>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedChat(group)}
                className="flex items-center gap-3 w-full p-3 hover:bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl mb-2 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="bg-gradient-to-r from-violet-100 to-fuchsia-100 p-2 rounded-lg">
                  <Users className="w-8 h-8 text-violet-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    {group.members.length} membres
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-violet-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Messages Directs</h2>
            </div>
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleChatSelect(contact)}
                className="flex items-center justify-between w-full p-3 hover:bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl mb-2 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={contact} />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">{contact.username}</h3>
                    <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                  </div>
                </div>
                {unreadCounts[contact.id] > 0 && (
                  <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                    {unreadCounts[contact.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
        {selectedChat ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-violet-100 bg-white/90 shadow-sm">
              <div className="flex items-center gap-3">
                {isGroup(selectedChat) ? (
                  <div className="bg-gradient-to-r from-violet-100 to-fuchsia-100 p-2 rounded-lg">
                    <Users className="w-8 h-8 text-violet-600" />
                  </div>
                ) : (
                  <Avatar user={selectedChat} size="lg" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {isGroup(selectedChat) ? selectedChat.name : selectedChat.username}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isGroup(selectedChat)
                      ? `${selectedChat.members.length} membres`
                      : selectedChat.email}
                  </p>
                </div>
              </div>
              {isGroup(selectedChat) && selectedChat.members.find(m => m.id === user?.id)?.is_admin && (
                <button
                  onClick={() => setShowGroupSettings(true)}
                  className="p-2 hover:bg-violet-100/50 rounded-full transition-colors duration-200"
                >
                  <Settings className="w-5 h-5 text-violet-600" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-violet-50/50 to-fuchsia-50/50">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      sender={message.sender}
                      isOwnMessage={message.sender_id === user?.id}
                      isGroupAdmin={isGroup(selectedChat) && selectedChat.members.find(m => 
                        m.id === user?.id
                      )?.is_admin}
                      onMessageUpdate={handleMessageUpdate}
                    />
                  ))}
                </div>
              )}
            </div>

            <ChatInput 
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
            />
            
            {/* Typing Indicator */}
            {Object.entries(typingUsers).map(([userId]) => {
              const typingUser = isGroup(selectedChat)
                ? selectedChat.members.find(m => m.id === userId)
                : contacts.find(c => c.id === userId);
              
              if (!typingUser) return null;
              
              return (
                <div key={userId} className="px-4 py-2 text-sm text-gray-500 italic bg-violet-50/50 border-t border-violet-100">
                  {typingUser.username} est en train d'écrire...
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50">
            <div className="text-center">
              <div className="mb-4">
                <Users className="w-16 h-16 text-violet-300 mx-auto" />
              </div>
              <p className="text-gray-500">Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>

      {/* Group Settings Modal */}
      {showGroupSettings && selectedChat && isGroup(selectedChat) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 p-6 rounded-2xl w-[480px] max-h-[80vh] overflow-y-auto shadow-xl border border-violet-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Group Settings</h2>
              <button
                onClick={() => setShowGroupSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Members</h3>
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add Member
                  </button>
                </div>
                
              {selectedChat.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={member} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.username}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          onlineUsers.has(member.id) ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        {member.is_admin && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{member.email}</span>
                    </div>
                  </div>
                  {user?.id !== member.id && selectedChat.members.find(m => m.id === user?.id)?.is_admin && (
                    <div className="flex items-center gap-2">
                      {!member.is_admin && (
                        <button
                          onClick={() => promoteToAdmin(selectedChat.id, member.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Make Admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedMemberToBan(member);
                          setShowBanModal(true);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
              
              {bannedMembers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Banned Members</h3>
                  {bannedMembers.map((ban) => (
                    <div key={ban.user_id} className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar user={ban.user} size="sm" />
                        <div>
                          <div className="font-medium">{ban.user.username}</div>
                          <div className="text-sm text-gray-500">
                            Banned by {ban.banned_by.username}
                            {ban.reason && ` - ${ban.reason}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnbanMember(ban.user_id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Ban Member Modal */}
      {showBanModal && selectedMemberToBan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 p-6 rounded-2xl w-[400px] shadow-xl border border-violet-100">
            <h3 className="text-lg font-semibold mb-4">
              Remove {selectedMemberToBan.username}
            </h3>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for removal (optional)"
              className="w-full p-2 border rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedMemberToBan(null);
                  setBanReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanMember(selectedMemberToBan)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 rounded-2xl p-6 w-full max-w-md shadow-xl border border-violet-100">
            <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Selected Members ({selectedMembers.length})</h3>
                  <div className="space-y-2">
                    {selectedMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Avatar user={member} size="sm" />
                          <span>{member.username}</span>
                        </div>
                        <button
                          onClick={() => setSelectedMembers(selectedMembers.filter(m => m.id !== member.id))}
                          className="text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search Users */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Add Members</h3>
                <UserSearch
                  onSelectUser={(user) => {
                    if (!selectedMembers.find(m => m.id === user.id)) {
                      setSelectedMembers([...selectedMembers, user]);
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isGroup(chat: User | Group): chat is Group {
  return Boolean(chat && 'members' in chat);
}

export default Chat;