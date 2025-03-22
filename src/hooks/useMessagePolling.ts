import { useEffect, useRef } from 'react';
import { Message } from '../types';
import { supabase } from '../services/api';

export function useMessagePolling(
  chatId: string | null,
  isGroup: boolean,
  currentUserId: string | null,
  onNewMessages: (messages: Message[]) => void
) {
  const pollingInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:users!sender_id(*), receiver:users!receiver_id(*)')
          .or(isGroup 
            ? `group_id.eq.${chatId}` 
            : `and(sender_id.eq.${currentUserId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true })
          .not('is_deleted', 'eq', true);

        if (error) throw error;
        onNewMessages(data as Message[]);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Fetch messages immediately
    fetchMessages();

    // Set up polling interval
    pollingInterval.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [chatId, isGroup, currentUserId, onNewMessages]);
}