import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isUniqueConstraintViolation } from '@/lib/sessionLifecycle';

export interface GameSession {
  id: string;
  room_id: string;
  reservation_id: string | null;
  song_id: string;
  singer_id: string;
  countdown_started_at: string | null;
  role_select_started_at: string | null;
  song_started_at: string | null;
  ended_at: string | null;
  status: 'waiting' | 'countdown' | 'role_select' | 'playing' | 'finished';
  created_at: string;
}

async function getActiveGameSession(roomId: string): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('room_id', roomId)
    .neq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active game session:', error);
    return null;
  }

  return data as GameSession | null;
}

export function useGameSession(roomId: string) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current active session
  const fetchSession = useCallback(async () => {
    setSession(await getActiveGameSession(roomId));
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchSession();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`game_session:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setSession(null);
        } else {
          setSession(payload.new as GameSession);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchSession]);

  return { session, loading, refetch: fetchSession };
}

// Create a new game session when a song is reserved
export async function createGameSession(
  roomId: string,
  reservationId: string,
  songId: string,
  singerId: string
): Promise<GameSession | null> {
  // First check if there's already an active session
  const existing = await getActiveGameSession(roomId);

  if (existing) {
    return existing as GameSession;
  }

  // Create new session with countdown starting NOW
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      room_id: roomId,
      reservation_id: reservationId,
      song_id: songId,
      singer_id: singerId,
      countdown_started_at: new Date().toISOString(),
      status: 'countdown',
    })
    .select()
    .single();

  if (isUniqueConstraintViolation(error)) {
    return getActiveGameSession(roomId);
  }

  if (error) {
    console.error('Error creating game session:', error);
    return null;
  }

  return data as GameSession;
}

// Update session to role_select phase
export async function startRoleSelect(sessionId: string): Promise<void> {
  await supabase
    .from('game_sessions')
    .update({
      role_select_started_at: new Date().toISOString(),
      status: 'role_select',
    })
    .eq('id', sessionId)
    .eq('status', 'countdown');
}

// Update session to playing phase
export async function startPlaying(sessionId: string): Promise<void> {
  await supabase
    .from('game_sessions')
    .update({
      song_started_at: new Date().toISOString(),
      status: 'playing',
    })
    .eq('id', sessionId)
    .eq('status', 'role_select');
}

// Mark session as finished and cleanup reservation
export async function finishSession(sessionId: string): Promise<void> {
  try {
    // Only the first finisher advances the queue. Repeated client events are no-ops.
    const { data: session, error: updateError } = await supabase
      .from('game_sessions')
      .update({
        ended_at: new Date().toISOString(),
        status: 'finished',
      })
      .eq('id', sessionId)
      .neq('status', 'finished')
      .select('reservation_id')
      .maybeSingle();

    if (updateError) {
      console.error('Error updating session status:', updateError);
      return;
    }

    // Delete the reservation to advance the queue
    if (session?.reservation_id) {
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', session.reservation_id);

      if (deleteError) {
        console.error('Error deleting reservation:', deleteError);
      }
    }
  } catch (error) {
    console.error('Unexpected error in finishSession:', error);
  }
}
