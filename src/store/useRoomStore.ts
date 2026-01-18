import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Participant } from '@/types';

interface RoomState {
  // Room info
  roomId: string | null;
  isHost: boolean;
  
  // User info
  myUserId: string | null;
  myName: string;
  
  // Participants
  participants: Participant[];
  
  // Actions
  setRoomId: (id: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setMyUserId: (id: string) => void;
  setMyName: (name: string) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  reset: () => void;
}

const initialState = {
  roomId: null,
  isHost: false,
  myUserId: null,
  myName: '',
  participants: [],
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,
  
  setRoomId: (id) => set({ roomId: id }),
  setIsHost: (isHost) => set({ isHost }),
  setMyUserId: (id) => set({ myUserId: id }),
  setMyName: (name) => set({ myName: name }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) => 
    set((state) => ({ 
      participants: [...state.participants, participant] 
    })),
  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),
  reset: () => set(initialState),
}));

// Generate random 6-digit room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate random user ID
export function generateUserId(): string {
  return crypto.randomUUID();
}

// Create a new room
export async function createRoom(hostId: string): Promise<string | null> {
  const roomId = generateRoomCode();
  
  const { error } = await supabase
    .from('rooms')
    .insert({
      id: roomId,
      host_id: hostId,
      status: 'waiting',
    });
  
  if (error) {
    console.error('Error creating room:', error);
    return null;
  }
  
  return roomId;
}

// Join a room
export async function joinRoom(
  roomId: string, 
  userId: string, 
  name: string
): Promise<boolean> {
  // Check if room exists
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (roomError || !room) {
    console.error('Room not found:', roomError);
    return false;
  }
  
  // Add participant
  const { error } = await supabase
    .from('participants')
    .insert({
      room_id: roomId,
      user_id: userId,
      name: name,
      role: 'spectator',
    });
  
  if (error) {
    console.error('Error joining room:', error);
    return false;
  }
  
  return true;
}

// Fetch participants for a room
export async function fetchParticipants(roomId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
  
  return data || [];
}

// Leave a room
export async function leaveRoom(participantId: string): Promise<void> {
  await supabase
    .from('participants')
    .delete()
    .eq('id', participantId);
}
