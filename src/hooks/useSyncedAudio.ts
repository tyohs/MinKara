import { useEffect, useRef, useState } from 'react';

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
    const handleCanPlay = async () => {
      console.log('[SyncedAudio] Audio ready to play', { duration: audio.duration, elapsedSeconds });
      
      if (audio.duration && elapsedSeconds < audio.duration) {
        // わずかな遅延やズレを許容し、シーク頻度を抑えるロジックを入れるべきだが、
        // ここでは初回同期のみを行う
        if (Math.abs(audio.currentTime - elapsedSeconds) > 0.5) {
          console.log(`[SyncedAudio] Seeking to ${elapsedSeconds.toFixed(2)}s`);
          audio.currentTime = elapsedSeconds;
        }
        
        try {
          console.log('[SyncedAudio] Attempting to play');
          await audio.play();
          console.log('[SyncedAudio] Playback started successfully');
          setIsPlaying(true);
          setError(null);
        } catch (error: any) {
          console.error('[SyncedAudio] Playback failed:', error);
          setError(error);
          setIsPlaying(false);
        }
      } else if (elapsedSeconds >= audio.duration) {
        // Song already finished
        console.log('[SyncedAudio] Song already finished, seeking to end');
        audio.currentTime = audio.duration;
      }
    };

    if (audio.readyState >= 3) {
      // Already loaded enough to play
      handleCanPlay();
    } else {
      console.log('[SyncedAudio] Audio not ready, waiting for canplay');
      audio.addEventListener('canplay', handleCanPlay, { once: true });
    }

  }, [songStartedAt]);

  // 再生状態を監視（オプション）
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
        console.log('[SyncedAudio] Play event');
        setIsPlaying(true);
        setError(null);
    };
    const onPause = () => console.log('[SyncedAudio] Pause event');
    const onEnded = () => console.log('[SyncedAudio] Ended event');
    const onError = (e: Event) => {
        console.error('[SyncedAudio] Error event:', e);
        setError(new Error('Playback error'));
        setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  return { audioRef, isPlaying, error };
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
