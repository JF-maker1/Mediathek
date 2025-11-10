"use client";

import YouTube from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
}

export default function VideoPlayer({ youtubeId }: VideoPlayerProps) {
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
    />
  );
}