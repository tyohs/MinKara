'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// 同期イベントの種類
export type SyncEventType = 
  | 'player_join'
  | 'player_leave'
  | 'call'
  | 'request'
  | 'message'
  | 'game_update'
  | 'game_start'
  | 'score_update'
  | 'reservation_update';

export interface SyncEvent {
  type: SyncEventType;
  roomId: string;
  playerId: string;
  playerName: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type GamePhase = 'song-select' | 'ready' | 'countdown' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  role: 'singer' | 'band' | 'audience';
  instrument?: string;
}

export interface RoomState {
  roomId: string | null;
  playerId: string;
  playerName: string;
  players: Player[];
  activeRequests: SyncEvent[];
  activeCalls: SyncEvent[];
  activeMessages: SyncEvent[];
  isConnected: boolean;
  
  // Game State Sync
  gamePhase: GamePhase;
  currentSongId: string | null;
  startTime: number | null;
  
  // Reservation System
  queue: any[]; // Reservation type will be imported or defined
  currentReservation: any | null; // Reservation type
  
  // Actions
  initRoom: (roomId: string, playerName: string, role: Player['role'], instrument?: string) => void;
  leaveRoom: () => void;
  broadcastCall: (callText: string, callEmoji: string) => void;
  broadcastRequest: (requestText: string, requestEmoji: string) => void;
  broadcastMessage: (messageText: string) => void;
  broadcastGameUpdate: (updates: Partial<{ gamePhase: GamePhase; currentSongId: string; startTime: number }>) => void;
  clearRequest: (timestamp: number) => void;
  clearMessage: (timestamp: number) => void;
  
  // Reservation Actions
  // Reservation Actions
  addReservation: (songId: string) => Promise<void>;
  cancelReservation: (reservationId: string) => Promise<void>;
  fetchReservations: () => Promise<void>;
  startGame: () => Promise<void>;
}

// Supabase Realtime channel
let channel: RealtimeChannel | null = null;

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  playerId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36),
  playerName: '',
  players: [],
  activeRequests: [],
  activeCalls: [],
  activeMessages: [],
  isConnected: false,
  
  gamePhase: 'song-select',
  currentSongId: null,
  startTime: null,
  
  queue: [],
  currentReservation: null,

  initRoom: (roomId, playerName, role, instrument) => {
    const state = get();
    
    // Close existing channel
    if (channel) {
      supabase.removeChannel(channel);
    }

    // Create Supabase Realtime channel for this room
    channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },  // Receive own messages too
      },
    });

    // Listen for broadcast events
    channel
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        const syncEvent = payload as SyncEvent;
        
        switch (syncEvent.type) {
          case 'player_join':
            set(s => ({
              players: [...s.players.filter(p => p.id !== syncEvent.playerId), {
                id: syncEvent.playerId,
                name: syncEvent.playerName,
                role: syncEvent.data.role as Player['role'],
                instrument: syncEvent.data.instrument as string | undefined,
              }]
            }));
            break;
            
          case 'player_leave':
            set(s => ({
              players: s.players.filter(p => p.id !== syncEvent.playerId)
            }));
            break;
            
          case 'call':
            set(s => ({
              activeCalls: [...s.activeCalls, syncEvent].slice(-10)
            }));
            // Auto-remove after 3 seconds
            setTimeout(() => {
              set(s => ({
                activeCalls: s.activeCalls.filter(c => c.timestamp !== syncEvent.timestamp)
              }));
            }, 3000);
            break;
            
          case 'request':
            set(s => ({
              activeRequests: [...s.activeRequests, syncEvent]
            }));
            break;
            
          case 'message':
            set(s => ({
              activeMessages: [...s.activeMessages, syncEvent].slice(-20)
            }));
            break;
            
          case 'game_update':
            // Merge received game state updates
            set(s => ({
              ...s,
              ...syncEvent.data
            }));
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isConnected: true });
          
          // Broadcast join event
          const joinEvent: SyncEvent = {
            type: 'player_join',
            roomId,
            playerId: state.playerId,
            playerName,
            data: { role, instrument },
            timestamp: Date.now(),
          };
          channel?.send({
            type: 'broadcast',
            event: 'sync',
            payload: joinEvent,
          });
        }
      });

    // Subscribe to Postgres Changes for Reservations
    const reservationChannel = supabase.channel(`reservations:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refresh reservations on any change
          get().fetchReservations();
        }
      )
      .subscribe();

    // Set initial state
    set({
      roomId,
      playerName,
      players: [{
        id: state.playerId,
        name: playerName,
        role,
        instrument,
      }],
    });
    
    // Initial fetch
    get().fetchReservations();
  },

  leaveRoom: () => {
    const state = get();
    
    if (channel && state.roomId) {
      const leaveEvent: SyncEvent = {
        type: 'player_leave',
        roomId: state.roomId,
        playerId: state.playerId,
        playerName: state.playerName,
        data: {},
        timestamp: Date.now(),
      };
      channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: leaveEvent,
      });
      supabase.removeChannel(channel);
      channel = null;
    }

    set({
      roomId: null,
      players: [],
      activeRequests: [],
      activeCalls: [],
      isConnected: false,
    });
  },

  broadcastCall: (callText, callEmoji) => {
    const state = get();
    if (!channel || !state.roomId) return;

    const callEvent: SyncEvent = {
      type: 'call',
      roomId: state.roomId,
      playerId: state.playerId,
      playerName: state.playerName,
      data: { text: callText, emoji: callEmoji },
      timestamp: Date.now(),
    };
    
    channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: callEvent,
    });
  },

  broadcastRequest: (requestText, requestEmoji) => {
    const state = get();
    if (!channel || !state.roomId) return;

    const requestEvent: SyncEvent = {
      type: 'request',
      roomId: state.roomId,
      playerId: state.playerId,
      playerName: state.playerName,
      data: { text: requestText, emoji: requestEmoji },
      timestamp: Date.now(),
    };
    
    channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: requestEvent,
    });
  },

  clearRequest: (timestamp) => {
    set(s => ({
      activeRequests: s.activeRequests.filter(r => r.timestamp !== timestamp)
    }));
  },

  broadcastMessage: (messageText) => {
    const state = get();
    if (!channel || !state.roomId) return;

    const messageEvent: SyncEvent = {
      type: 'message',
      roomId: state.roomId,
      playerId: state.playerId,
      playerName: state.playerName,
      data: { text: messageText },
      timestamp: Date.now(),
    };
    
    channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: messageEvent,
    });
  },

  clearMessage: (timestamp) => {
    set(s => ({
      activeMessages: s.activeMessages.filter(m => m.timestamp !== timestamp)
    }));
  },

  broadcastGameUpdate: (updates) => {
    const state = get();
    if (!channel || !state.roomId) return;

    // Apply updates locally first
    set(updates);

    const updateEvent: SyncEvent = {
      type: 'game_update',
      roomId: state.roomId,
      playerId: state.playerId,
      playerName: state.playerName,
      data: updates,
      timestamp: Date.now(),
    };
    
    channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: updateEvent,
    });
  },


  addReservation: async (songId) => {
    const state = get();
    if (!state.roomId) return;

    await supabase.from('reservations').insert({
      room_id: state.roomId,
      user_id: state.playerId,
      song_id: songId,
      status: 'pending'
    });
  },

  cancelReservation: async (reservationId) => {
    await supabase.from('reservations').delete().eq('id', reservationId);
  },

  fetchReservations: async () => {
    const state = get();
    if (!state.roomId) return;

    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('room_id', state.roomId)
      .in('status', ['pending', 'playing'])
      .order('created_at', { ascending: true });
      
    if (data) {
      // Assuming user names would be joined in a real app or separate fetch
      // For now, mapping raw data.
      // We might need to map user_id to user_name from `players` list locally
      
      const mappedReservations = data.map((r: any) => {
        const player = state.players.find(p => p.id === r.user_id);
        return {
          ...r,
          user_name: player ? player.name : 'Unknown',
        };
      });

      set({ 
        queue: mappedReservations.filter((r: any) => r.status === 'pending'),
        currentReservation: mappedReservations.find((r: any) => r.status === 'playing') || null
      });
    }
  },

  startGame: async () => {
    const state = get();
    if (!state.roomId || state.queue.length === 0) return;

    const nextReservation = state.queue[0];

    // 1. Update Reservation Status
    await supabase
      .from('reservations')
      .update({ status: 'playing' })
      .eq('id', nextReservation.id);

    // 2. Broadcast Game Start (Triggering clients to switch UI)
    state.broadcastGameUpdate({
      gamePhase: 'playing',
      currentSongId: nextReservation.song_id,
      startTime: Date.now() + 5000 // 5 seconds countdown
    });
  }
}));
