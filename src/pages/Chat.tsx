import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Settings, ChevronDown, ChevronRight} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  promoteToAdmin,
  deleteMessage
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
import { useNavigate } from 'react-router-dom';
import GroupProfile from './GroupProfile';
import FloatingPaths from '../components/FloatingPaths';

// Define GEMINI_USER locally since import is causing issues
const GEMINI_USER: User = {
  id: 'gemini',
  username: 'Gemini AI',
  email: 'gemini@chatfrar.com',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gemini&backgroundColor=7977e8'
};

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [showGroupProfile, setShowGroupProfile] = useState(false); // New state
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [initialized, setInitialized] = useState(false);
  const messageSubscription = useRef<any>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message | null } | null>(null);
  // Using useRef instead of useState to avoid "value never read" warning
  const inputMessageRef = useRef('');
  const setInputMessage = (value: string) => {
    inputMessageRef.current = value;
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
          
          // Si l'utilisateur n'est pas au bas de la conversation et il ne s'agit pas de son propre message
          if (!isAtBottom && message.sender_id !== user.id) {
            setHasNewMessages(true);
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
  }, [user, selectedChat, isAtBottom]);

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
            
            // Si l'utilisateur n'est pas au bas de la conversation, indiquer qu'il y a de nouveaux messages
            if (!isAtBottom && newMessage.sender_id !== user.id) {
              setHasNewMessages(true);
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
  }, [selectedChat, user, isAtBottom]);

  // Join/leave chat rooms when selected chat changes
  useEffect(() => {
    if (!selectedChat || !user) return;
    
    const chatId = isGroup(selectedChat) ? selectedChat.id : `dm_${user.id}_${selectedChat.id}`;
    joinChat(chatId); // Vérifiez que 'joinChat' est bien appelé
    
    return () => {
      leaveChat(chatId); // Vérifiez que 'leaveChat' est bien appelé
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
      // Use a regular expression to match variations of "@gemini"
      const geminiRegex = /@g(e|i|m|n|in|mi|em|ni|mn|im|ei|en|me|nm|ne|ii|nn|mm|emini|gmini|gemni|gemiin|gemin|gemi|gemn|gimini)/i;
  
      if (geminiRegex.test(content)) {
        // Create a temporary message for immediate display
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
          reply_to_id: null,
        };
  
        // Add the temporary message
        setMessages((prev) => [...prev, tempMessage]);
  
        // Get Gemini's response
        const geminiResponse = await getGeminiResponse(content, messages);
  
        if (geminiResponse) {
          // Create Gemini's response message
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
            reply_to_id: tempMessage.id,
          };
  
          // Add Gemini's response message
          setMessages((prev) => [...prev, geminiMessage]);
        }
      } else {
        // Send a normal message
        const message = await sendMessage(
          content,
          image || null,
          isGroup(selectedChat) ? undefined : selectedChat.id,
          isGroup(selectedChat) ? selectedChat.id : undefined
        );
  
        if (message) {
          sendChatMessage(message); // Emit the message via socket
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
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
    // Only auto-scroll if user is already at the bottom or it's a new message from the current user
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Consider "at bottom" if within 100px of the bottom
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(isBottom);
    
    // Si on est au bas de la conversation, réinitialiser le flag des nouveaux messages
    if (isBottom) {
      setHasNewMessages(false);
    }
  };

  const handleChatSelect = async (chat: User | Group) => {
    // Effacer les messages pour éviter l'affichage des anciens messages
    setMessages([]);
  
    // Ajouter une légère temporisation pour une transition fluide
    setTimeout(async () => {
      setSelectedChat(chat);
  
      const chatId = chat.id;
      const isGroupChat = isGroup(chat);
  
      // Charger les messages pour la nouvelle conversation
      await loadMessages(chatId, isGroupChat);
  
      // Réinitialiser le compteur de messages non lus pour les messages directs
      if (!isGroupChat) {
        try {
          await resetUnreadCount(chat.id);
          setUnreadCounts(prev => ({ ...prev, [chat.id]: 0 }));
        } catch (error) {
          console.error('Error resetting unread count:', error);
        }
      }
  
      // Rejoindre la salle de chat
      const roomId = isGroupChat ? chatId : `dm_${user?.id}_${chatId}`;
      joinChat(roomId); // Vérifiez que 'joinChat' est bien appelé
    }, 200); // Temporisation de 200ms pour une transition fluide
  };

  const handleAddContact = (selectedUser: User) => {
    // Prevent adding yourself as a contact
    if (selectedUser.id === user?.id) return;
    
    // Add to contacts if not already present
    if (!contacts.find(c => c.id === selectedUser.id)) {
      setContacts(prev => {
        // Double check to avoid duplicates
        if (prev.some(c => c.id === selectedUser.id)) {
          return prev;
        }
        return [selectedUser, ...prev];
      });
    }
    
    // Always open the chat with the selected user
    handleChatSelect(selectedUser);
    setSearchOpen(false);
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

  const handleContextMenu = (event: React.MouseEvent, message: Message) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      message,
    });
  };
  
  const handleReply = (message: Message) => {
    setInputMessage(`@${message.sender.username} `); // Use setInputMessage to prefill the input
    setContextMenu(null);
  };
  
  const handleEdit = (message: Message) => {
    setInputMessage(message.content); // Use setInputMessage to prefill the input for editing
    setContextMenu(null);
  };
  
  const handleDelete = async (message: Message) => {
    try {
      await deleteMessage(message.id); // Ensure deleteMessage is imported from services/api
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setContextMenu(null);
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      {/* Sidebar */}
      <motion.div 
        className="relative bg-white/80 backdrop-blur-sm border-r border-violet-100 flex flex-col shadow-lg"
        initial={{ width: isSidebarOpen ? '20rem' : '4rem' }}
        animate={{ width: isSidebarOpen ? '20rem' : '4rem' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-10 z-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full p-1.5 shadow-lg hover:shadow-violet-500/40 transition-all duration-300 border border-violet-400"
        >
          <motion.div
            animate={{ rotate: isSidebarOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-full p-0.5"
          >
            <ChevronRight className="w-4 h-4 text-violet-600" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              className="p-4 border-b border-violet-100 bg-gradient-to-r from-violet-100/50 to-fuchsia-100/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/profile')}
                    className="focus:outline-none transform transition-all duration-200 hover:scale-105 hover:opacity-75"
                    title="View Profile"
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
                <div className="mt-4 bg-white shadow-lg rounded-lg p-4 z-20">
                  <UserSearch
                    onSelectUser={(user) => {
                      handleAddContact(user);
                      setSearchOpen(false);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isSidebarOpen ? (
          <div className="flex-1 flex flex-col items-center py-4 overflow-hidden">
            {/* Minimized groups */}
            <div className="w-full flex flex-col items-center gap-4 mb-6">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Users className="w-6 h-6 text-violet-600" />
              </div>
              {groups.slice(0, 5).map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    handleChatSelect(group);
                    setIsSidebarOpen(true);
                  }}
                  className="p-2 hover:bg-violet-100/50 rounded-full transition-colors"
                  title={group.name}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-violet-600">
                      {group.name.charAt(0)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Minimized contacts */}
            {contacts.slice(0, 8).map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  handleChatSelect(contact);
                  setIsSidebarOpen(true);
                }}
                className="mb-3 relative"
                title={contact.username}
              >
                <Avatar user={contact} size="sm" />
                {unreadCounts[contact.id] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadCounts[contact.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
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
                  onClick={() => handleChatSelect(group)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl mb-2 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <div className="bg-gradient-to-r from-violet-100 to-fuchsia-100 p-2 rounded-lg">
                    <Users className="w-8 h-8 text-violet-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.members?.length || 0} {group.members?.length === 1 ? 'membre' : 'membres'}
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
        )}
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm transition-opacity duration-200">
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
                      ? `${selectedChat.members?.length || 0} ${selectedChat.members?.length === 1 ? 'membre' : 'membres'}`
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
              {isGroup(selectedChat) && (
                <button
                  onClick={() => setShowGroupProfile(true)}
                  className="p-2 hover:bg-violet-100/50 rounded-full transition-colors duration-200"
                >
                  <Users className="w-5 h-5 text-violet-600" />
                </button>
              )}
            </div>

            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-violet-50/50 to-fuchsia-50/50 relative"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages
                    .filter(message =>
                      isGroup(selectedChat)
                        ? message.group_id === selectedChat.id
                        : (message.sender_id === selectedChat.id && message.receiver_id === user?.id) ||
                          (message.sender_id === user?.id && message.receiver_id === selectedChat.id)
                    )
                    .map((message) => (
                      <div
                        key={message.id}
                        onDoubleClick={(e) => handleContextMenu(e, message)} // Add double-click handler
                        className="relative"
                      >
                        <ChatMessage
                          message={message}
                          sender={message.sender}
                          isOwnMessage={message.sender_id === user?.id}
                          isGroupAdmin={isGroup(selectedChat) && selectedChat.members.find(m => m.id === user?.id)?.is_admin}
                          onMessageUpdate={handleMessageUpdate}
                        />
                      </div>
                    ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Context Menu */}
              {contextMenu && (
                <div
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  className="absolute bg-white shadow-lg rounded-lg p-2 z-50"
                >
                  <button
                    onClick={() => handleReply(contextMenu.message!)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Reply
                  </button>
                  {contextMenu.message?.sender_id === user?.id && (
                    <>
                      <button
                        onClick={() => handleEdit(contextMenu.message!)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contextMenu.message!)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
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

            {/* Bouton pour scroller vers les nouveaux messages */}
            {hasNewMessages && !isAtBottom && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-violet-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce hover:bg-violet-600 transition-colors z-10"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Nouveaux messages</span>
                  <ChevronDown className="h-4 w-4" /> {/* Ensure ChevronDown is imported */}
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 relative overflow-hidden">
            {/* Animated Floating Paths Background */}
            <FloatingPaths position={1.2} />
            
            <div className="text-center max-w-md px-6 z-10">
              <div className="mb-6">
                <Users className="w-20 h-20 text-violet-400 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-violet-600 mb-3">Bienvenue sur ChatFrar</h2>
              <p className="text-gray-600 mb-6">Sélectionnez une conversation pour commencer ou créez-en une nouvelle en utilisant le bouton "+" dans la barre latérale.</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/80 rounded-xl shadow-sm border border-violet-100">
                  <h3 className="font-medium text-violet-700 mb-2">Vous pouvez :</h3>
                  <ul className="text-left text-gray-600 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                      <span>Discuter avec vos contacts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                      <span>Participer à des groupes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                      <span>Utiliser Gemini AI avec @gemini</span>
                    </li>
                  </ul>
                </div>
                
                <button 
                  onClick={() => {
                    setIsSidebarOpen(true);  // Open the sidebar
                    setSearchOpen(true);     // Open the search dialog
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Commencer une nouvelle conversation
                </button>
              </div>
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

      {/* Group Profile Modal */}
      {showGroupProfile && selectedChat && isGroup(selectedChat) && (
        <GroupProfile 
          group={selectedChat}
          onlineUsers={onlineUsers}
          onClose={() => setShowGroupProfile(false)}
        />
      )}
    </div>
  );
}

function isGroup(chat: User | Group): chat is Group {
  return Boolean(chat && 'members' in chat);
}

export default Chat;