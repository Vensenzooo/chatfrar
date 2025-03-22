import React from 'react';
import { MoreVertical, Trash2, Reply } from 'lucide-react';
import { Message, User } from '../types';
import { Avatar } from './Avatar';
import { deleteMessage } from '../services/api';

interface ChatMessageProps {
  message: Message;
  onUpdate: (messageId: string, content: string) => Promise<void>;
  onReply: (message: Message) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onUpdate,
  onReply
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    try {
      await deleteMessage(message.id);
      setShowMenu(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.is_deleted) {
    return (
      <div className="flex items-center justify-center py-2">
        <p className="text-sm text-gray-500 italic">Message supprimé</p>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 mb-4">
      <Avatar user={message.sender} size="sm" />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{message.sender.username}</span>
          <span className="text-sm text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>
        <p className="mt-1">{message.content}</p>
        {message.image && (
          <img
            src={message.image}
            alt="Message attachment"
            className="mt-2 max-w-xs rounded-lg"
          />
        )}
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => onReply(message)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Reply
          </button>
          <button
            onClick={() => onUpdate(message.id, message.content)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Edit
          </button>
        </div>
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-sm text-gray-500 hover:text-gray-600"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 