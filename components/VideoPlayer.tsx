"use client";

import YouTube from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
  // 1. PŘIDÁNÍ onReady PROPU
  onReady?: (event: { target: any }) => void;
}

export default function VideoPlayer({ youtubeId, onReady }: VideoPlayerProps) {
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
    },
  };
  
  return (
    <YouTube
      videoId={youtubeId}
      opts={opts}
      className="absolute top-0 left-0 w-full h-full"
      // 2. PROPOJENÍ onReady
      onReady={onReady}
    />
  );
}