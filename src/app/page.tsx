'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="home-page">
      {/* Video Background */}
      <video
        className="video-bg"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        role="presentation"
        title="Background animation"
      >
        <source src="/video/background-monochrome.mp4" type="video/mp4" />
      </video>

      <div className="home-container">
        {/* Logo */}
        <Image
          src="/images/logo.png"
          alt="MinKara - みんなでカラオケをプレイしよう"
          width={800}
          height={800}
          className="home-logo"
          priority
        />
        
        {/* Catchcopy */}
        <Image
          src="/images/catchcopy.png"
          alt="みんなでカラオケをプレイしよう"
          width={600}
          height={200}
          className="home-catchcopy"
          priority
        />

        {/* Buttons */}
        <nav className="home-nav">
          <button
            onClick={() => router.push('/room/create')}
            className="home-btn primary"
          >
            <Image
              src="/images/icon-mic.png"
              alt=""
              width={80}
              height={80}
              className="home-btn-icon"
            />
            <span className="home-btn-text">
              <span className="home-btn-title">ルームを作成</span>
              <span className="home-btn-desc">新しいパーティを始めよう</span>
            </span>
            <span className="home-btn-arrow">▶</span>
          </button>

          <button
            onClick={() => router.push('/room/join')}
            className="home-btn"
          >
            <Image
              src="/images/icon-hand.png"
              alt=""
              width={80}
              height={80}
              className="home-btn-icon"
            />
            <span className="home-btn-text">
              <span className="home-btn-title">ルームに参加</span>
              <span className="home-btn-desc">友達のパーティに入ろう</span>
            </span>
            <span className="home-btn-arrow">▶</span>
          </button>
        </nav>


      </div>
    </div>
  );
}
