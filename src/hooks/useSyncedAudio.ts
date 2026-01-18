import { useEffect, useRef } from 'react';

/**
 * Synced audio playback hook
 * 
 * Automatically seeks audio to the correct position based on
 * when playback started on the server.
 * 
 * @param songStartedAt - ISO timestamp when song started (from server)
 * @param audioUrl - URL of the audio file
 * @returns Audio ref and playback state
 */
export function useSyncedAudio(songStartedAt: string | null, audioUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!songStartedAt) return;

    const audio = audioRef.current;
    if (!audio) return;

    const startTime = new Date(songStartedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;

    // Only seek and play if within song duration
    const handleCanPlay = () => {
      if (audio.duration && elapsedSeconds < audio.duration) {
        audio.currentTime = elapsedSeconds;
        audio.play().catch(console.error);
      } else if (elapsedSeconds >= audio.duration) {
        // Song already finished
        audio.currentTime = audio.duration;
      }
    };

    if (audio.readyState >= 3) {
      // Already loaded enough to play
      handleCanPlay();
    } else {
      audio.addEventListener('canplay', handleCanPlay, { once: true });
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [songStartedAt]);

  return audioRef;
}

/**
 * Calculate current playback position based on server time
 */
export function getPlaybackPosition(songStartedAt: string | null): number {
  if (!songStartedAt) return 0;
  
  const startTime = new Date(songStartedAt).getTime();
  const now = Date.now();
  return Math.max(0, (now - startTime) / 1000);
}
