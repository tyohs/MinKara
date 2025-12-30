'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function RoomNavigation({ roomId }: { roomId: string }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'ロビー', icon: '🏠', path: `/room/${roomId}` },
    { label: 'シンガー', icon: '🎤', path: `/room/${roomId}/singer` },
    { label: 'バンド', icon: '🎸', path: `/room/${roomId}/band` },
    { label: '応援', icon: '📣', path: `/room/${roomId}/audience` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className="relative flex flex-col items-center justify-center p-2 w-full h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-x-2 top-1 bottom-1 bg-white/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`text-2xl mb-0.5 relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium relative z-10 ${isActive ? 'text-white' : 'text-white/40'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
