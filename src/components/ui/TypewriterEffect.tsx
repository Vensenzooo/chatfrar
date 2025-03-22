import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  duration?: number;
  filter?: boolean;
}

export const TextGenerateEffect: React.FC<TextGenerateEffectProps> = ({
  words,
  className = '',
  duration = 0.5,
  filter = false
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < words.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + words[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, duration * 1000 / words.length);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, words, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayedText}
      {filter && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </motion.span>
  );
}; 