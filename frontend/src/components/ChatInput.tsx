import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, image: File | null) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping
}) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    await onSend(content.trim(), image);
    setContent('');
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleTyping = () => {
    onTyping(true);
    const timeout = setTimeout(() => {
      onTyping(false);
    }, 1000);
    return () => clearTimeout(timeout);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-gray-500 hover:text-gray-700"
      >
        <ImageIcon size={20} />
      </button>
      <input
        type="text"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          handleTyping();
        }}
        placeholder="Type a message..."
        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!content.trim() && !image}
        className="p-2 text-blue-500 hover:text-blue-700 disabled:text-gray-400"
      >
        <Send size={20} />
      </button>
    </form>
  );
}; 