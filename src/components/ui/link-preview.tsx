import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { cn } from '../../utils/cn';

type LinkPreviewProps = {
  children: React.ReactNode;
  url: string;
  className?: string;
};

export const LinkPreview = ({
  children,
  url,
  className,
}: LinkPreviewProps) => {
  const [isOpen, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);
  const translateX = useSpring(x, springConfig);

  const handleMouseMove = (event: React.MouseEvent) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;
    x.set(offsetFromCenter);
  };

  // Generate preview image URL
  const previewUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=dark&viewport.isMobile=true&viewport.deviceScaleFactor=1&viewport.width=600&viewport.height=400`;

  return (
    <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <a
        onMouseMove={handleMouseMove}
        className={cn("text-black dark:text-white hover:underline", className)}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>

      <AnimatePresence>
        {isMounted && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9, rotateX: -10 }}
            animate={{ 
              opacity: 1, 
              y: -10, 
              scale: 1, 
              rotateX: 0,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 20,
                mass: 0.8,
              }
            }}
            exit={{ 
              opacity: 0, 
              y: 10, 
              scale: 0.9, 
              rotateX: -10,
              transition: { 
                duration: 0.2,
                ease: "easeOut" 
              }
            }}
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full shadow-xl rounded-xl z-50 top-0 mb-2 pointer-events-none backdrop-blur-sm"
            style={{
              x: translateX,
              width: "230px",
              perspective: "1000px",
              transformStyle: "preserve-3d",
              boxShadow: "0 15px 35px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.1)"
            }}
          >
            <a
              href={url}
              className="block p-1 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-xl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { delay: 0.1, duration: 0.4 }
                }}
                src={previewUrl}
                alt="Link preview"
                className="rounded-lg w-full h-32 object-cover"
                loading="lazy"
              />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
