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
  duration = 2,
  filter = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < words.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + words[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, duration * 1000 / words.length);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, words, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {displayedText}
    </motion.span>
  );
}; 