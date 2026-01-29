// 歌詞データの型定義

export interface LyricLine {
  /** 表示開始時間（秒） */
  time: number;
  /** 歌詞テキスト */
  text: string;
  /** 表示終了時間（秒）- 省略時は次の歌詞まで表示 */
  endTime?: number;
}

export interface SongLyrics {
  /** 曲ID（songs.tsのidと一致させる） */
  songId: string;
  /** 歌詞データ */
  lines: LyricLine[];
}
