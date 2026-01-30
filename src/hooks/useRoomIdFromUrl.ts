'use client';

import { useState, useEffect } from 'react';

/**
 * URLパスからルームIDを取得するカスタムフック
 * @param propRoomId コンポーネントのPropsから渡されるroomId（優先度高）
 * @returns 有効なroomId
 */
export function useRoomIdFromUrl(propRoomId?: string): string {
  const [urlRoomId, setUrlRoomId] = useState('');

  useEffect(() => {
    // PropsでroomIdが渡されていない場合のみURLから取得を試みる
    if (typeof window !== 'undefined' && !propRoomId) {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        setUrlRoomId(match[1]);
      }
    }
  }, [propRoomId]);

  return propRoomId || urlRoomId;
}
