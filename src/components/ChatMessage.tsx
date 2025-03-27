// React is automatically imported by the JSX transform
import { Message, User } from '../types';
import { Avatar } from './Avatar';
import { formatDistanceToNow } from '../utils/date';
import { Music, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { editMessage, deleteMessage } from '../services/api';
import { ChatLinkPreview } from './ui/chat-link-preview';

// Function to detect URLs in text
const findUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

interface ChatMessageProps {
  message: Message;
  sender: User;
  isOwnMessage: boolean;
  isGroupAdmin?: boolean;
  onMessageUpdate: () => void;
}

export function ChatMessage({ 
  message, 
  sender, 
  isOwnMessage, 
  isGroupAdmin,
  onMessageUpdate 
}: ChatMessageProps) {
  if (!message || !sender) {
    return (
      <div className="text-sm text-gray-400 italic">
        Message unavailable
      </div>
    );
  }

  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Extract URLs from message content
  const urls = findUrls(message.content);
  const hasUrl = urls.length > 0;

  const handleEdit = async () => {
    try {
      await editMessage(message.id, editContent);
      setIsEditing(false);
      onMessageUpdate();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(message.id);
      onMessageUpdate();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  if (message.is_deleted) {
    return (
      <div className="text-sm text-gray-400 italic">
        This message has been deleted
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar user={sender} size="sm" />
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''} max-w-[70%`}>
        <div className="relative group">
          {(isOwnMessage || isGroupAdmin) && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-black/10"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          )}
          
          {showMenu && (
            <div className="absolute top-8 right-0 bg-white rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              {isOwnMessage && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {(isOwnMessage || isGroupAdmin) && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 w-full text-sm text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}

          {isEditing ? (
            <div className="flex items-end gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="btn btn-primary"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`chat-bubble ${
              isOwnMessage ? 'chat-bubble-own' : 'chat-bubble-other'
            }`}>
              {message.content}
              {message.edited_at && (
                <span className="text-xs opacity-70"> (edited)</span>
              )}
            </div>
          )}
        </div>
        
        {/* URL Preview Section */}
        {hasUrl && !isEditing && (
          <ChatLinkPreview url={urls[0]} />
        )}
        
        {message.image && isImageFile(message.image) && (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-files/${message.image}`}
            alt="Message attachment" 
            className="rounded-xl max-w-full h-auto max-h-[300px] object-contain mt-2 shadow-chat"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {message.image && isAudioFile(message.image) && (
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-chat mt-2 border border-gray-100">
            <Music className="w-5 h-5 text-gray-500" />
            <audio
              controls
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-files/${message.image}`}
              className="max-w-[300px]"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        <span className="text-xs text-gray-500 mt-2">
          {message.created_at ? formatDistanceToNow(new Date(message.created_at)) : ''}
        </span>
      </div>
    </div>
  );
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

function isAudioFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '');
}