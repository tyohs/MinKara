// Re-export all game components
export { default as KeyboardGame } from './KeyboardGame';
export { default as GuitarGame } from './GuitarGame';
export { default as DrumGame } from './DrumGame';
export { default as SingerGame } from './SingerGame';
export { default as PianoKeys } from './PianoKeys';
export { default as Note } from './Note';
export { default as NoteTrack } from './NoteTrack';
export { default as ScoreDisplay } from './ScoreDisplay';
export { default as JudgmentDisplay } from './JudgmentDisplay';

// Re-export types
export type { NoteData } from './Note';

// Re-export config (single source of truth)
export * from '@/lib/gameConfig';
