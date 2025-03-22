import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (content: string, image?: File | null) => void;
  onTyping: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({ onSendMessage, onTyping, textareaRef: externalRef }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaReference = externalRef || internalTextareaRef;

  // Ajuster automatiquement la hauteur du textarea
  useEffect(() => {
    if (textareaReference) {
      textareaReference.current!.style.height = 'auto';
      textareaReference.current!.style.height = `${Math.min(textareaReference.current!.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaReference) {
        textareaReference.current!.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage('', file);
    }
  };

  const handleTyping = () => {
    onTyping();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <motion.div 
        className="relative rounded-xl p-3"
        initial={false}
        animate={{
          background: isFocused 
            ? 'linear-gradient(45deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))'
            : 'linear-gradient(45deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8))',
          borderColor: isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(30, 41, 59, 0.5)',
          boxShadow: isFocused 
            ? '0 0 20px rgba(99, 102, 241, 0.2), 0 0 40px rgba(168, 85, 247, 0.1)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Effet de bordure animée */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: isFocused
                ? 'linear-gradient(45deg, #6366f1, #a855f7, #6366f1)'
                : 'linear-gradient(45deg, #1e293b, #0f172a)',
            }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute inset-[1px] rounded-[11px] bg-slate-950/90" />
        </div>

        {/* Contenu */}
        <div className="relative">
          {/* Barre d'outils supérieure */}
          <div className="flex items-center gap-2 px-2 mb-2">
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5 text-slate-400" />
            </motion.button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
            />
            <motion.button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Smile className="w-5 h-5 text-slate-400" />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Zone de texte avec animation */}
          <div className="relative flex items-end">
            <textarea
              ref={textareaReference}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Écrivez votre message..."
              className="w-full bg-transparent border-none focus:outline-none resize-none text-slate-100 placeholder-slate-500 p-2 min-h-[40px] max-h-[120px] pr-12 font-medium text-base leading-relaxed"
              rows={1}
            />
            <motion.div
              initial={false}
              animate={{
                scale: message.trim() ? 1 : 0.8,
                opacity: message.trim() ? 1 : 0.5,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute right-2 bottom-2"
            >
              <button
                type="submit"
                disabled={!message.trim()}
                className={`p-2.5 rounded-lg transition-all ${
                  message.trim()
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </motion.div>
          </div>

          {/* Indicateur d'enregistrement */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-500/20"
              >
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                Enregistrement...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Sélecteur d'emoji avec animation */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 bg-slate-950/95 rounded-lg border border-slate-800/50 p-4 shadow-xl"
          >
            <div className="grid grid-cols-8 gap-2">
              {['😊', '😂', '❤️', '👍', '🎉', '🌟', '💫', '✨'].map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-2xl"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}