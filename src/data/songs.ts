// Sample song data for MinKara
// These are placeholder entries - in production, would use actual free/licensed music

import type { Song } from '@/types';

export const SONGS: Song[] = [
  {
    id: 'song-001',
    title: 'シャイニングスター',
    artist: '魔王魂, 森田交一',
    bpm: 158,
    genre: 'Pop',
    duration: 276,
    audio_url: '/audio/shining_star.mp3',
  },
  {
    id: 'song-002',
    title: '仰げば尊し',
    artist: '不詳',
    bpm: 96,
    genre: '唱歌',
    duration: 211,
    audio_url: '/audio/仰げば尊し.mp3',
  },
  {
    id: 'song-003',
    title: 'burning_heart',
    artist: '魔王魂',
    bpm: 142,
    genre: 'Pop',
    duration: 312,
    audio_url: '/audio/burning_heart.mp3',
  },
];

export const GENRES = ['All', 'Pop', 'Rock', 'Electronic', 'Dance', 'Chill', 'Acoustic', '唱歌'];

export function getSongById(id: string): Song | undefined {
  return SONGS.find(song => song.id === id);
}

export function filterSongs(query: string, genre: string): Song[] {
  return SONGS.filter(song => {
    const matchesQuery = query === '' || 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = genre === 'All' || song.genre === genre;
    return matchesQuery && matchesGenre;
  });
}
