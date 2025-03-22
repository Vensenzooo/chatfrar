import { useEffect, useRef } from 'react';

const BackgroundAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.2;
      audioRef.current.loop = true;
      audioRef.current.play().catch(error => {
        console.log('Lecture automatique non autorisée:', error);
      });
    }
  }, []);

  return (
    <audio ref={audioRef} src="/audio/videoplayback.mp3" />
  );
};

export default BackgroundAudio; 