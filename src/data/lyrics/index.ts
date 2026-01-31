// 歌詞データのエクスポート
export * from './types';

import { shiningStarLyrics } from './shining_star';
import { aogebaToutoshiLyrics } from './aogeba_toutoshi';
import { burningHeartLyrics } from './burning_heart';
import { cryingAgainLyrics } from './crying_again';
import type { SongLyrics } from './types';

// 全歌詞データのマップ
const lyricsMap: Record<string, SongLyrics> = {
  'song-001': shiningStarLyrics,
  'song-002': aogebaToutoshiLyrics,
  'song-003': burningHeartLyrics,
  'song-004': cryingAgainLyrics,
};

/**
 * 曲IDから歌詞データを取得
 */
export function getLyricsForSong(songId: string): SongLyrics | null {
  return lyricsMap[songId] ?? null;
}

/**
 * 現在時刻に対応する歌詞を取得
 */
export function getCurrentLyric(lyrics: SongLyrics, currentTime: number): string | null {
  const lines = lyrics.lines;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (currentTime >= line.time) {
      // endTimeが設定されていて、それを過ぎていたら表示しない
      if (line.endTime != null && currentTime > line.endTime) {
        return null;
      }
      return line.text;
    }
  }
  
  return null;
}
