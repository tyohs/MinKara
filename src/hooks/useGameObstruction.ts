import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { OBSTRUCT_DURATIONS, ObstructId } from '@/lib/gameConfig';

export const useGameObstruction = (activeRoomId: string) => {
  const [activeObstructs, setActiveObstructs] = useState<Set<number>>(new Set());
  const timeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const triggerObstruct = useCallback((id: number) => {
    // 既存のタイマーがあればクリア
    if (timeoutRefs.current.has(id)) {
      clearTimeout(timeoutRefs.current.get(id));
      timeoutRefs.current.delete(id);
    }

    setActiveObstructs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const duration = OBSTRUCT_DURATIONS[id as ObstructId] || 5000;

    // 一定時間後に解除
    const timeoutId = setTimeout(() => {
      setActiveObstructs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timeoutRefs.current.delete(id);
    }, duration);

    timeoutRefs.current.set(id, timeoutId);
  }, []);

  // クリーンアップ：コンポーネントアンマウント時に全タイマーを解除
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // お邪魔イベントの受信
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase.channel(`room:${activeRoomId}`);
    channel
      .on('broadcast', { event: 'obstruct' }, (payload) => {
        const data = payload.payload as { id: number; target?: string };
        const { id, target } = data;

        // ターゲット判定: 自分の役割でない攻撃は必要に応じて無視
        if (target === 'singer') return;

        triggerObstruct(id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, triggerObstruct]);

  return {
    activeObstructs,
    triggerObstruct,
  };
};
