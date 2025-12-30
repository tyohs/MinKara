'use client';

import { useParams } from 'next/navigation';
import RoomNavigation from '@/components/room/RoomNavigation';

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="min-h-screen app-bg text-white pb-20">
      {/* Main Content Area */}
      <div className="relative z-0">
        {children}
      </div>

      {/* Persistent Navigation */}
      <div className="relative z-50">
        <RoomNavigation roomId={roomId} />
      </div>
    </div>
  );
}
