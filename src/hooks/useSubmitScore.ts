import { supabase } from '@/lib/supabase';
import { finishSession } from './useGameSession';

interface ScoreSubmission {
  roomId: string;
  sessionId: string;
  userId: string;
  score: number;
  maxCombo: number;
}

/**
 * Submit score to Supabase when game ends
 */
export async function submitScore({
  roomId,
  sessionId,
  userId,
  score,
}: ScoreSubmission): Promise<boolean> {
  try {
    // Update participant's score
    const { error: scoreError } = await supabase
      .from('participants')
      .update({ score })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (scoreError) {
      console.error('Error updating score:', scoreError);
      return false;
    }

    // Mark session as finished
    await finishSession(sessionId);

    return true;
  } catch (error) {
    console.error('Error submitting score:', error);
    return false;
  }
}

/**
 * Get user ID from localStorage or generate new one
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  let userId = localStorage.getItem('minkaraUserId');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('minkaraUserId', userId);
  }
  return userId;
}
