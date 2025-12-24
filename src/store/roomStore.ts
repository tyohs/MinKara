'use client';

import { create } from 'zustand';

// 同期イベントの種類
export type SyncEventType = 
  | 'player_join'
  | 'player_leave'
  | 'call'
  | 'request'
  | 'message'
  | 'game_start'
  | 'score_update';

export interface SyncEvent {
  type: SyncEventType;
  roomId: string;
  playerId: string;
  playerName: string;
  data: Record<string, unknown>;
  timestamp: number;
}

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
  
  // Actions
  initRoom: (roomId: string, playerName: string, role: Player['role'], instrument?: string) => void;
  leaveRoom: () => void;
  broadcastCall: (callText: string, callEmoji: string) => void;
  broadcastRequest: (requestText: string, requestEmoji: string) => void;
  broadcastMessage: (messageText: string) => void;
  clearRequest: (timestamp: number) => void;
  clearMessage: (timestamp: number) => void;
}

// BroadcastChannel for cross-tab communication
let channel: BroadcastChannel | null = null;

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  playerId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36),
  playerName: '',
  players: [],
  activeRequests: [],
  activeCalls: [],
  activeMessages: [],
  isConnected: false,

  initRoom: (roomId, playerName, role, instrument) => {
    const state = get();
    
    // Close existing channel
    if (channel) {
      channel.close();
    }

    // Create new channel for this room
    channel = new BroadcastChannel(`encore-room-${roomId}`);
    
    // Listen for messages
    channel.onmessage = (event: MessageEvent<SyncEvent>) => {
      const syncEvent = event.data;
      
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
            activeCalls: [...s.activeCalls, syncEvent].slice(-10) // Keep last 10
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
      }
    };

    // Set initial state
    set({
      roomId,
      playerName,
      isConnected: true,
      players: [{
        id: state.playerId,
        name: playerName,
        role,
        instrument,
      }],
    });

    // Broadcast join event
    const joinEvent: SyncEvent = {
      type: 'player_join',
      roomId,
      playerId: state.playerId,
      playerName,
      data: { role, instrument },
      timestamp: Date.now(),
    };
    channel.postMessage(joinEvent);
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
      channel.postMessage(leaveEvent);
      channel.close();
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
    
    channel.postMessage(callEvent);
    
    // Also add to local state
    set(s => ({
      activeCalls: [...s.activeCalls, callEvent].slice(-10)
    }));
    setTimeout(() => {
      set(s => ({
        activeCalls: s.activeCalls.filter(c => c.timestamp !== callEvent.timestamp)
      }));
    }, 3000);
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
    
    channel.postMessage(requestEvent);
    
    // Also add to local state
    set(s => ({
      activeRequests: [...s.activeRequests, requestEvent]
    }));
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
    
    channel.postMessage(messageEvent);
    
    set(s => ({
      activeMessages: [...s.activeMessages, messageEvent].slice(-20)
    }));
  },

  clearMessage: (timestamp) => {
    set(s => ({
      activeMessages: s.activeMessages.filter(m => m.timestamp !== timestamp)
    }));
  },
}));
