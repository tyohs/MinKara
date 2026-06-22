import { NoteData } from '@/components/game/Note';
import { LANE_COUNT } from '@/lib/gameConfig';

interface GenerateNotesOptions {
  songId: string;
  bpm: number;
  duration: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  specialNoteChance?: number;
}

/**
 * BPMと曲の長さからノーツを自動生成
 * difficulty: 'easy' -> Normal (ずっと2分音符)
 * difficulty: 'hard' -> Hard (ランダム譜面)
 */
export function generateNotesFromBPM(options: GenerateNotesOptions): NoteData[] {
  const {
    bpm,
    duration,
    difficulty = 'normal',
    specialNoteChance = 0.1,
  } = options;

  const notes: NoteData[] = [];
  const beatDuration = 60000 / bpm; // 1拍の長さ(ms)
  const totalMs = duration * 1000;
  const startOffset = 2000; // 2秒後から開始
  
  let time = startOffset;
  let prevLane = -1;

  while (time < totalMs - 1000) {
    
    // --- ▼ リズム決定ロジック ▼ ---
    // availableDivisors: ノーツ間隔の選択肢
    // 0.5 = 2分音符（2拍に1回）
    // 1   = 4分音符（1拍に1回）
    // 2   = 8分音符（半拍に1回）
    // 3   = 3連符
    // 4   = 16分音符
    // 5   = 5連符
    
    let availableDivisors: number[] = [];
    
    if (difficulty === 'easy') {
      // ★Normalモード (UI上のNormal):
      // 「ずっと2分音符」
      availableDivisors = [0.5]; 
      
    } else if (difficulty === 'hard') {
      // ★Hardモード (UI上のHard):
      // 「ランダム譜面」
      
      // 基本セット: 2分音符と4分音符を多めに入れて、休憩ポイントを作る
      availableDivisors = [0.5, 0.5, 1, 1, 1]; 

      // BPMが速すぎなければ、細かい連打も混ぜる
      // BPM 200未満なら 8分音符 を許可
      if (bpm < 200) availableDivisors.push(2); 
      
      // BPM 160未満なら 3連符 を許可
      if (bpm < 160) availableDivisors.push(3); 
      
      // BPM 130未満なら 16分音符・5連符 を許可（これ以上速いと人間には厳しい）
      if (bpm < 130) {
        availableDivisors.push(4); 
        availableDivisors.push(5); 
      }
    } else {
      // デフォルト (normal指定時など)
      // 安全策として、easyとhardの中間くらい（4分音符主体）
      availableDivisors = [0.5, 1];
    }

    // ランダムに1つ選ぶ
    const divisor = availableDivisors[Math.floor(Math.random() * availableDivisors.length)];
    
    // 次のノーツまでの間隔を計算（1拍 ÷ 分割数）
    const interval = beatDuration / divisor;

    // --- ▲ リズム決定ロジック終わり ▲ ---

    // レーン決定（前回と同じレーンが連続しすぎないように調整）
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === prevLane && Math.random() > 0.3) {
      lane = (lane + Math.floor(Math.random() * (LANE_COUNT - 1)) + 1) % LANE_COUNT;
    }

    const isSpecial = Math.random() < specialNoteChance;

    notes.push({
      id: crypto.randomUUID(),
      lane,
      time: Math.round(time),
      type: isSpecial ? 'special' : 'normal',
      hit: false,
    });

    prevLane = lane;
    time += interval; // 計算した間隔分だけ時間を進める
  }

  console.log(`[generateNotesFromBPM] Difficulty: ${difficulty}, BPM: ${bpm}, Notes: ${notes.length}`);
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
