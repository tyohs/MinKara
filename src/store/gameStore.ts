'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Room, Participant, FansaRequest, FansaType, PENLIGHT_COLORS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface GameState {
  // Current user
  currentUser: Participant | null;
  
  // Room state
  room: Room | null;
  
  // Game state
  isPlaying: boolean;
  startTime: number | null;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentUser: (user: Participant) => void;
  createRoom: (hostName: string) => Promise<string>;
  joinRoom: (roomId: string, userName: string) => Promise<boolean>;
  setRole: (role: 'singer' | 'audience') => void;
  startGame: () => void;
  endGame: () => void;
  
  // Score & excitement
  addScore: (points: number) => void;
  updateExcitement: (delta: number) => void;
  
  // Fansa
  sendFansaRequest: (type: FansaType) => void;
  completeFansa: (requestId: string) => void;
  
  // Penlight
  setPenLightColor: (color: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentUser: null,
  room: null,
  isPlaying: false,
  startTime: null,
  isLoading: false,
  error: null,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  createRoom: async (hostName) => {
    set({ isLoading: true, error: null });
    
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const hostId = uuidv4();
    
    try {
      // Create room in Supabase
      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          host_id: hostId,
          status: 'waiting',
        });
      
      if (roomError) throw roomError;
      
      // Add host as participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          room_id: roomId,
          user_id: hostId,
          name: hostName,
          role: 'singer',
        });
      
      if (participantError) throw participantError;
      
      const host: Participant = {
        id: hostId,
        name: hostName,
        role: 'singer',
        score: 0,
        isHost: true,
        penLightColor: PENLIGHT_COLORS[0],
      };
      
      const room: Room = {
        id: roomId,
        hostId,
        participants: [host],
        status: 'waiting',
        excitementGauge: 0,
        fansaRequests: [],
      };
      
      set({ room, currentUser: host, isLoading: false });
      return roomId;
    } catch (err) {
      console.error('Error creating room:', err);
      set({ error: 'ルームの作成に失敗しました', isLoading: false });
      return '';
    }
  },
  
  joinRoom: async (roomId, userName) => {
    set({ isLoading: true, error: null });
    
    const userId = uuidv4();
    
    try {
      // Check if room exists
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomError || !roomData) {
        set({ error: 'ルームが見つかりません', isLoading: false });
        return false;
      }
      
      // Add participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          name: userName,
          role: 'audience',
        });
      
      if (participantError) throw participantError;
      
      // Get all participants
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId);
      
      const user: Participant = {
        id: userId,
        name: userName,
        role: 'audience',
        score: 0,
        isHost: false,
        penLightColor: PENLIGHT_COLORS[Math.floor(Math.random() * PENLIGHT_COLORS.length)],
      };
      
      const room: Room = {
        id: roomId,
        hostId: roomData.host_id,
        participants: participants?.map(p => ({
          id: p.user_id,
          name: p.name,
          role: p.role as 'singer' | 'band' | 'audience',
          score: p.score || 0,
          isHost: p.user_id === roomData.host_id,
          penLightColor: PENLIGHT_COLORS[0],
        })) || [user],
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        excitementGauge: 0,
        fansaRequests: [],
      };
      
      set({ room, currentUser: user, isLoading: false });
      return true;
    } catch (err) {
      console.error('Error joining room:', err);
      set({ error: 'ルームへの参加に失敗しました', isLoading: false });
      return false;
    }
  },
  
  setRole: (role) => {
    set((state) => {
      if (!state.currentUser || !state.room) return state;
      
      const updatedUser = { ...state.currentUser, role };
      const participants = state.room.participants.map((p) =>
        p.id === state.currentUser?.id ? updatedUser : p
      );
      
      return {
        currentUser: updatedUser,
        room: { ...state.room, participants },
      };
    });
  },
  
  startGame: () => {
    set((state) => ({
      isPlaying: true,
      startTime: Date.now(),
      room: state.room ? { ...state.room, status: 'playing' } : null,
    }));
  },
  
  endGame: () => {
    set((state) => ({
      isPlaying: false,
      room: state.room ? { ...state.room, status: 'finished' } : null,
    }));
  },
  
  addScore: (points) => {
    set((state) => {
      if (!state.currentUser || !state.room) return state;
      
      const newScore = state.currentUser.score + points;
      const updatedUser = { ...state.currentUser, score: newScore };
      const participants = state.room.participants.map((p) =>
        p.id === state.currentUser?.id ? updatedUser : p
      );
      
      // Also update excitement gauge
      const excitementDelta = points / 10;
      const newExcitement = Math.min(100, state.room.excitementGauge + excitementDelta);
      
      return {
        currentUser: updatedUser,
        room: { 
          ...state.room, 
          participants,
          excitementGauge: newExcitement,
        },
      };
    });
  },
  
  updateExcitement: (delta) => {
    set((state) => {
      if (!state.room) return state;
      const newExcitement = Math.max(0, Math.min(100, state.room.excitementGauge + delta));
      return {
        room: { ...state.room, excitementGauge: newExcitement },
      };
    });
  },
  
  sendFansaRequest: (type) => {
    set((state) => {
      if (!state.currentUser || !state.room) return state;
      
      const request: FansaRequest = {
        id: uuidv4(),
        fromParticipantId: state.currentUser.id,
        type,
        completed: false,
        timestamp: Date.now(),
      };
      
      return {
        room: {
          ...state.room,
          fansaRequests: [...state.room.fansaRequests, request],
        },
      };
    });
  },
  
  completeFansa: (requestId) => {
    set((state) => {
      if (!state.room) return state;
      
      const fansaRequests = state.room.fansaRequests.map((r) =>
        r.id === requestId ? { ...r, completed: true } : r
      );
      
      // Boost excitement when fansa is completed
      const newExcitement = Math.min(100, state.room.excitementGauge + 5);
      
      return {
        room: {
          ...state.room,
          fansaRequests,
          excitementGauge: newExcitement,
        },
      };
    });
  },
  
  setPenLightColor: (color) => {
    set((state) => {
      if (!state.currentUser || !state.room) return state;
      
      const updatedUser = { ...state.currentUser, penLightColor: color };
      const participants = state.room.participants.map((p) =>
        p.id === state.currentUser?.id ? updatedUser : p
      );
      
      return {
        currentUser: updatedUser,
        room: { ...state.room, participants },
      };
    });
  },
}));
