import { useEffect, useCallback, useState } from 'react';

type OrientationType = 'landscape' | 'portrait' | 'any';

// Type for Screen Orientation API with optional lock/unlock methods
type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};

interface UseScreenLockResult {
  isLocked: boolean;
  lockOrientation: (orientation: OrientationType) => Promise<boolean>;
  unlockOrientation: () => void;
  error: string | null;
}

/**
 * Hook to lock screen orientation during gameplay
 * 
 * Uses the Screen Orientation API to prevent rotation.
 * Falls back gracefully on unsupported browsers.
 * 
 * @param initialOrientation - The orientation to lock on mount (optional)
 */
export function useScreenLock(initialOrientation?: OrientationType): UseScreenLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockOrientation = useCallback(async (orientation: OrientationType): Promise<boolean> => {
    const screenOrientation = screen.orientation as ScreenOrientationWithLock | undefined;
    
    // Check if Screen Orientation API is available
    if (!screenOrientation || !screenOrientation.lock) {
      setError('Screen Orientation API not supported');
      return false;
    }

    try {
      let lockType: string;
      
      switch (orientation) {
        case 'landscape':
          lockType = 'landscape-primary';
          break;
        case 'portrait':
          lockType = 'portrait-primary';
          break;
        case 'any':
        default:
          lockType = 'any';
      }

      await screenOrientation.lock(lockType);
      setIsLocked(true);
      setError(null);
      return true;
    } catch (err) {
      // Common errors:
      // - NotSupportedError: Device doesn't support locking
      // - SecurityError: Not in fullscreen mode (required on some browsers)
      const errorMessage = err instanceof Error ? err.message : 'Failed to lock orientation';
      setError(errorMessage);
      setIsLocked(false);
      return false;
    }
  }, []);

  const unlockOrientation = useCallback(() => {
    const screenOrientation = screen.orientation as ScreenOrientationWithLock | undefined;
    
    if (screenOrientation && screenOrientation.unlock) {
      try {
        screenOrientation.unlock();
        setIsLocked(false);
        setError(null);
      } catch {
        // Ignore unlock errors
      }
    }
  }, []);

  // Lock on mount if initialOrientation is provided
  useEffect(() => {
    if (initialOrientation) {
      lockOrientation(initialOrientation);
    }

    // Unlock on unmount
    return () => {
      unlockOrientation();
    };
  }, [initialOrientation, lockOrientation, unlockOrientation]);

  return {
    isLocked,
    lockOrientation,
    unlockOrientation,
    error,
  };
}

/**
 * Request fullscreen mode (required for orientation lock on some browsers)
 */
export async function requestFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Exit fullscreen mode
 */
export function exitFullscreen(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.exitFullscreen && document.fullscreenElement) {
    document.exitFullscreen();
  }
}
