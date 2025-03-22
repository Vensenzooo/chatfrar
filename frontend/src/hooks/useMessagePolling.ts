import { useEffect, useRef } from 'react';
import { Message } from '../types';
import { getChatMessages, getGroupMessages } from '../services/api';

export const useMessagePolling = (
  chatId: string | null,
  isGroup: boolean,
  currentUserId: string | null,
  onNewMessages: (messages: Message[]) => void
) => {
  const pollingInterval = useRef<NodeJS.Timeout>();
  const lastMessageTimestamp = useRef<string | null>(null);

  useEffect(() => {
    if (!chatId || !currentUserId) {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      return;
    }

    const pollMessages = async () => {
      try {
        const messages = isGroup
          ? await getGroupMessages(chatId)
          : await getChatMessages(chatId);

        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          if (latestMessage.created_at !== lastMessageTimestamp.current) {
            lastMessageTimestamp.current = latestMessage.created_at;
            onNewMessages(messages);
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Poll immediately
    pollMessages();

    // Set up polling interval
    pollingInterval.current = setInterval(pollMessages, 5000); // Poll every 5 seconds

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [chatId, isGroup, currentUserId, onNewMessages]);
}; 