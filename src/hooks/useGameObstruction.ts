import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const OBSTRUCT_DURATION = 5000;

export const useGameObstruction = (activeRoomId: string, role?: string) => {
  const [activeObstructs, setActiveObstructs] = useState<Set<number>>(new Set());

  const triggerObstruct = useCallback((id: number) => {
    console.log('[GameObstruction] Triggering obstruct ID:', id);
    setActiveObstructs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // 一定時間後に解除
    setTimeout(() => {
      setActiveObstructs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, OBSTRUCT_DURATION);
  }, []);

  // お邪魔イベントの受信
  useEffect(() => {
    if (!activeRoomId) return;

    console.log('[GameObstruction] Subscribing to room:', activeRoomId);

    const channel = supabase.channel(`room:${activeRoomId}`);
    channel
      .on('broadcast', { event: 'obstruct' }, (payload) => {
        const data = payload.payload as { id: number; target?: string };
        console.log('[GameObstruction] Received obstruct event:', data);
        const { id, target } = data;

        // ターゲット判定: 自分の役割でない攻撃は必要に応じて無視
        // roleが指定されている場合、singer宛て以外でもターゲットが一致しなければ弾く等のロジック拡張が可能
        // ここでは既存のGuitarGameのロジック「singer宛ては無視」を継承
        if (target === 'singer') return;

        triggerObstruct(id);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GameObstruction] Ready to receive obstructs');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, triggerObstruct, role]);

  return {
    activeObstructs,
    triggerObstruct,
  };
};
