import { useState, useEffect } from 'react';

/**
 * Server-synced countdown hook
 * 
 * Instead of counting down locally, this calculates remaining time
 * based on when the countdown started on the server.
 * 
 * @param startedAt - ISO timestamp when countdown started (from server)
 * @param duration - Total countdown duration in seconds
 * @returns Remaining seconds (can be decimal for smooth display)
 */
export function useSyncedCountdown(
  startedAt: string | null,
  duration: number
): { remaining: number; isComplete: boolean } {
  const [remaining, setRemaining] = useState(duration);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!startedAt) {
      setRemaining(duration);
      setIsComplete(false);
      return;
    }

    const startTime = new Date(startedAt).getTime();

    const update = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      setRemaining(remaining);
      
      if (remaining <= 0) {
        setIsComplete(true);
      }
    };

    // Initial update immediately
    update();

    // Update every 100ms for smooth countdown
    const interval = setInterval(update, 100);

    return () => clearInterval(interval);
  }, [startedAt, duration]);

  return { remaining, isComplete };
}

/**
 * Get remaining seconds as a whole number for display
 */
export function useDisplayCountdown(
  startedAt: string | null,
  duration: number
): number {
  const { remaining } = useSyncedCountdown(startedAt, duration);
  return Math.ceil(remaining);
}
