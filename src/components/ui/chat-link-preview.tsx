import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ChatLinkPreviewProps = {
  url: string;
};

export const ChatLinkPreview = ({ url }: ChatLinkPreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<{
    title?: string;
    description?: string;
    image?: string;
    url: string;
  }>({ url });

  useEffect(() => {
    // Generate preview image URL from microlink API
    const previewUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    
    fetch(previewUrl)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.data) {
          setPreviewData({
            title: data.data.title || '',
            description: data.data.description || '',
            image: data.data.image?.url || data.data.logo?.url,
            url
          });
        }
      })
      .catch(err => console.error('Error fetching link preview:', err))
      .finally(() => setIsLoading(false));
  }, [url]);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 10, height: 0 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            height: 'auto',
            transition: {
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -10, 
            height: 0,
            transition: {
              duration: 0.2
            }
          }}
          className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 overflow-hidden"
        >
          <div className="space-y-2">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-2/3 animate-pulse"></div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="loaded"
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
              type: "spring",
              stiffness: 400,
              damping: 25,
              mass: 1
            }
          }}
          className="mt-2 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            {previewData.image && (
              <motion.div 
                className="h-32 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { delay: 0.1, duration: 0.3 }
                }}
              >
                <img 
                  src={previewData.image} 
                  alt={previewData.title || 'Link preview'} 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </motion.div>
            )}
            
            <motion.div 
              className="p-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { 
                  delay: 0.2,
                  duration: 0.3
                }
              }}
            >
              <h4 className="font-medium text-sm text-violet-600 dark:text-violet-400 truncate">
                {previewData.title || url}
              </h4>
              {previewData.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {previewData.description}
                </p>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                {new URL(url).hostname}
              </div>
            </motion.div>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
