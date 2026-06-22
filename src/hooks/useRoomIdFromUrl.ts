'use client';

import { usePathname } from 'next/navigation';

/**
 * URLパスからルームIDを取得するカスタムフック
 * @param propRoomId コンポーネントのPropsから渡されるroomId（優先度高）
 * @returns 有効なroomId
 */
export function useRoomIdFromUrl(propRoomId?: string): string {
  const pathname = usePathname();
  const urlRoomId = pathname.match(/\/room\/([^/]+)/)?.[1] ?? '';
  return propRoomId || urlRoomId;
}
