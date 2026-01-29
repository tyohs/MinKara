import { NoteData } from '@/components/game/Note';
import { LANE_COUNT } from '@/lib/gameConfig';
import { v4 as uuidv4 } from 'uuid';

interface GenerateNotesOptions {
  songId: string;
  bpm: number;
  duration: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  specialNoteChance?: number;
}

/**
 * BPMと曲の長さからノーツを自動生成
 */
export function generateNotesFromBPM(options: GenerateNotesOptions): NoteData[] {
  const {
    bpm,
    duration,
    difficulty = 'normal',
    specialNoteChance = 0.1,
  } = options;

  const notes: NoteData[] = [];
  const beatDuration = 60000 / bpm;
  
  // 難易度ごとの拍分割（数値が大きいほどノーツが多い）
  const beatDivisor = {
    easy: 0.5,    // 2拍に1回
    normal: 1,    // 1拍に1回
    hard: 2,      // 半拍に1回
  }[difficulty];

  const noteInterval = beatDuration / beatDivisor;
  const totalMs = duration * 1000;
  const startOffset = 2000; // 2秒後から開始
  
  let time = startOffset;
  let prevLane = -1;

  while (time < totalMs - 1000) {
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === prevLane && Math.random() > 0.3) {
      lane = (lane + Math.floor(Math.random() * (LANE_COUNT - 1)) + 1) % LANE_COUNT;
    }

    const isSpecial = Math.random() < specialNoteChance;

    notes.push({
      id: uuidv4(),
      lane,
      time: Math.round(time),
      type: isSpecial ? 'special' : 'normal',
      hit: false,
    });

    prevLane = lane;
    time += noteInterval;
  }

  console.log(`[generateNotesFromBPM] BPM: ${bpm}, Duration: ${duration}s, Notes: ${notes.length}`);
  return notes;
}

/**
 * 途中参加用：経過時間以降のノーツのみを取得
 */
export function getNotesFromPosition(
  allNotes: NoteData[], 
  elapsedMs: number, 
  bufferMs: number = 1000
): NoteData[] {
  const startTime = elapsedMs - bufferMs;
  return allNotes.filter(note => note.time >= startTime);
}
