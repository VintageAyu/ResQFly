import React, { useEffect, useRef, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4';

const TOTAL_FRAMES = 97;

export const BackgroundVideo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const prevXRef = useRef<number | null>(null);
  const targetProgressRef = useRef<number>(0.1);
  const currentProgressRef = useRef<number>(0.1);

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState<number>(0);

  // 1. Preload 97 high-definition frames into memory for true 60+ FPS zero-latency rendering
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let count = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/frames/frame_${String(i).padStart(3, '0')}.jpg`;
      img.onload = () => {
        count += 1;
        setLoadedCount(count);
      };
      images.push(img);
    }

    imagesRef.current = images;

    return () => {
      images.forEach((img) => {
        img.onload = null;
      });
      imagesRef.current = [];
    };
  }, []);

  // 2. High-Performance 60+ FPS Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      const deltaMs = Math.min(32, time - lastTime);
      lastTime = time;

      // On mobile or when autoplaying, smoothly increment progress
      if (window.innerWidth < 1024) {
        // Continuous smooth 60 FPS playback on mobile
        targetProgressRef.current = (targetProgressRef.current + (deltaMs / 4000)) % 1;
        currentProgressRef.current = targetProgressRef.current;
      } else {
        // Smooth exponential lerp (60-120+ FPS physics damping)
        const diff = targetProgressRef.current - currentProgressRef.current;
        if (Math.abs(diff) > 0.0001) {
          currentProgressRef.current += diff * 0.14;
        } else {
          currentProgressRef.current = targetProgressRef.current;
        }
      }

      const progress = currentProgressRef.current;
      const canvas = canvasRef.current;
      const images = imagesRef.current;

      if (!canvas || images.length === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;

      // Map progress to frame index [0, TOTAL_FRAMES - 1]
      const clamped = Math.max(0, Math.min(1, progress));
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(clamped * (TOTAL_FRAMES - 1)))
      );

      const img = images[frameIndex];
      if (img && img.complete && img.naturalWidth > 0) {
        const cWidth = canvas.width;
        const cHeight = canvas.height;
        const iWidth = img.naturalWidth;
        const iHeight = img.naturalHeight;

        // Object-cover calculation
        const scale = Math.max(cWidth / iWidth, cHeight / iHeight);
        const drawWidth = iWidth * scale;
        const drawHeight = iHeight * scale;

        // Object-right / right-bottom positioning
        const x = cWidth - drawWidth;
        const y = cHeight - drawHeight;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [loadedCount]);

  // 3. High-DPI Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 4. Desktop Mouse Scrubbing Hook (Matching User Specification)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) {
        prevXRef.current = null;
        return;
      }

      if (prevXRef.current === null) {
        prevXRef.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevXRef.current;
      prevXRef.current = e.clientX;

      // Update target scrub time based on (delta / window.innerWidth) * 0.8
      const step = (delta / window.innerWidth) * 0.8;
      targetProgressRef.current = Math.max(
        0,
        Math.min(1, targetProgressRef.current + step)
      );

      // Sync fallback video currentTime if needed
      const video = videoRef.current;
      if (video && video.duration && !Number.isNaN(video.duration)) {
        if (!video.paused) video.pause();
        video.currentTime = targetProgressRef.current * video.duration;
      }
    };

    const handleMouseLeave = () => {
      prevXRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 5. Mobile Autoplay Hook (< 1024px)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleResizeAndAutoplay = () => {
      if (window.innerWidth < 1024) {
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        video.autoplay = false;
        video.loop = false;
        video.pause();
      }
    };

    handleResizeAndAutoplay();
    window.addEventListener('resize', handleResizeAndAutoplay);

    return () => {
      window.removeEventListener('resize', handleResizeAndAutoplay);
    };
  }, []);

  const isReady = loadedCount > 10;

  return (
    <div
      ref={containerRef}
      className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent"
      aria-hidden="true"
    >
      {/* 60+ FPS Hardware-Accelerated Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover object-right lg:object-right-bottom absolute inset-0 transition-opacity duration-300 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Video Element Specification */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        className={`w-full h-full object-cover object-right lg:object-right-bottom ${
          isReady ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};
