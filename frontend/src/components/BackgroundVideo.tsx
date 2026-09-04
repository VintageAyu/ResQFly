import React, { useEffect, useRef, useState } from 'react';

const FALLBACK_VIDEO_URL = '/robot_hero.mp4';
const TOTAL_FRAMES = 241;

// Landmarks from much_better.mp4 (360° orbital rotation):
// - Frame 1: Center Neutral Forward
// - Frame 24: Look Straight Up (12:00)
// - Frame 51: Look Up-Right (1:30)
// - Frame 78: Look Right (3:00)
// - Frame 105: Look Down-Right (4:30)
// - Frame 132: Look Straight Down (6:00)
// - Frame 159: Look Down-Left (7:30)
// - Frame 186: Look Left (9:00)
// - Frame 213: Look Up-Left (10:30)
// - Frame 240: Loop back to Up (12:00)

type GazeDirection =
  | 'CENTER'
  | 'LOOKING UP'
  | 'LOOKING UP-RIGHT'
  | 'LOOKING RIGHT'
  | 'LOOKING DOWN-RIGHT'
  | 'LOOKING DOWN'
  | 'LOOKING DOWN-LEFT'
  | 'LOOKING LEFT'
  | 'LOOKING UP-LEFT';

export const BackgroundVideo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mouse & Gaze Tracking State
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const idleTimerRef = useRef<number | null>(null);

  // Continuous 2D Neural Gaze Engine State
  const smoothedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentOrbitFrameRef = useRef<number>(24.0);
  const currentBlendRef = useRef<number>(0.0);

  const [directionLabel, setDirectionLabel] = useState<GazeDirection>('CENTER');
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  // 1. Preload 241 High-Definition Video Frames into Memory
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

  // 2. High-Performance 60-120+ FPS Continuous 360° Orbital Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const isMobile = window.innerWidth < 1024;
      const isMouseActive = mousePosRef.current.active;

      // Target position in [-1, 1] relative to center
      const targetX = (isMobile || !isMouseActive) ? 0 : mousePosRef.current.x;
      const targetY = (isMobile || !isMouseActive) ? 0 : mousePosRef.current.y;

      // 60-120 FPS continuous 2D position smoothing
      smoothedPosRef.current.x += (targetX - smoothedPosRef.current.x) * 0.16;
      smoothedPosRef.current.y += (targetY - smoothedPosRef.current.y) * 0.16;

      const sx = smoothedPosRef.current.x;
      const sy = smoothedPosRef.current.y;
      const r = Math.hypot(sx, sy);

      // Smooth proportional deflection factor t in [0, 1]
      const rDead = 0.08;
      let targetT = 0;
      if (r > rDead) {
        targetT = Math.min(1.0, (r - rDead) / (0.55 - rDead));
      }
      currentBlendRef.current += (targetT - currentBlendRef.current) * 0.18;
      const blend = currentBlendRef.current;

      // Continuous angle alpha from UP (12:00 = 0 rad, clockwise to 2pi)
      const theta = Math.atan2(sy, sx);
      let alpha = theta + Math.PI / 2.0;
      if (alpha < 0) alpha += 2.0 * Math.PI;

      // Target frame on the 360° perimeter orbit
      const targetOrbitFrame = 24.0 + (alpha / (2.0 * Math.PI)) * 216.0;

      // Shortest-path modular angular lerping for the orbit frame
      if (blend <= 0.05) {
        currentOrbitFrameRef.current = targetOrbitFrame;
      } else {
        const curProgress = (currentOrbitFrameRef.current - 24.0) / 216.0;
        let curAngle = curProgress * 2.0 * Math.PI;

        let delta = alpha - curAngle;
        while (delta > Math.PI) delta -= 2.0 * Math.PI;
        while (delta < -Math.PI) delta += 2.0 * Math.PI;

        curAngle += delta * 0.18;
        while (curAngle < 0) curAngle += 2.0 * Math.PI;
        while (curAngle >= 2.0 * Math.PI) curAngle -= 2.0 * Math.PI;

        currentOrbitFrameRef.current = 24.0 + (curAngle / (2.0 * Math.PI)) * 216.0;
      }

      // Render Active Frame to Canvas
      const canvas = canvasRef.current;
      const images = imagesRef.current;

      if (!canvas || images.length === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;

      const imgCenter = images[0]; // Frame 1: Center Neutral
      if (!imgCenter || !imgCenter.complete || imgCenter.naturalWidth === 0) return;

      const cWidth = canvas.width;
      const cHeight = canvas.height;
      const iWidth = imgCenter.naturalWidth;
      const iHeight = imgCenter.naturalHeight;

      // Object-cover calculation
      const scale = Math.max(cWidth / iWidth, cHeight / iHeight);
      const drawWidth = iWidth * scale;
      const drawHeight = iHeight * scale;

      // Position on desktop: slightly towards right half to frame next to hero text
      let x: number;
      if (cWidth >= 1024) {
        x = cWidth - drawWidth * 0.85;
        if (x > 0) x = 0;
        if (x + drawWidth < cWidth) x = cWidth - drawWidth;
      } else {
        x = (cWidth - drawWidth) * 0.5;
      }

      const y = Math.min(0, (cHeight - drawHeight) * 0.25);

      // Check if in pure vertical UP sector (sy < 0 and |sx| < 0.22)
      const isPureUp = sy < 0 && Math.abs(sx) < 0.22;

      if (isPureUp) {
        // Native filmed frames 1..24 directly for vertical UP motion
        const upFrameIdx = Math.max(1, Math.min(24, Math.round(1.0 + blend * 23.0)));
        const upImg = images[upFrameIdx - 1];
        if (upImg && upImg.complete) {
          ctx.drawImage(upImg, x, y, drawWidth, drawHeight);
        }
      } else {
        const orbitClamped = Math.max(24, Math.min(240, Math.round(currentOrbitFrameRef.current)));
        const orbitImg = images[orbitClamped - 1];

        if (blend <= 0.02) {
          // 100% Center (Frame 1)
          ctx.drawImage(imgCenter, x, y, drawWidth, drawHeight);
        } else if (blend >= 0.98 && orbitImg && orbitImg.complete) {
          // 100% Orbit Frame
          ctx.drawImage(orbitImg, x, y, drawWidth, drawHeight);
        } else {
          // Smooth transition between Center and Orbit
          ctx.drawImage(imgCenter, x, y, drawWidth, drawHeight);
          if (orbitImg && orbitImg.complete) {
            ctx.globalAlpha = blend;
            ctx.drawImage(orbitImg, x, y, drawWidth, drawHeight);
            ctx.globalAlpha = 1.0;
          }
        }
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

  // 4. Interactive 360° Cursor Angle & Diagonal Synchronization
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;

      mousePosRef.current.active = true;

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        mousePosRef.current.active = false;
        setDirectionLabel('CENTER');
      }, 3000);

      // Normalized coordinates [-1, 1] relative to viewport center
      const centerX = window.innerWidth * 0.5;
      const centerY = window.innerHeight * 0.5;

      const nx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth * 0.45)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight * 0.45)));

      mousePosRef.current.x = nx;
      mousePosRef.current.y = ny;

      const r = Math.hypot(nx, ny);

      // Deadzone near center -> neutral forward pose (Frame 1)
      if (r <= 0.15) {
        setDirectionLabel('CENTER');
        return;
      }

      // Calculate angle alpha from UP (12:00 = 0 rad, clockwise to 2pi)
      const theta = Math.atan2(ny, nx); // theta in [-pi, pi], where right is 0, down is +pi/2, up is -pi/2
      let alpha = theta + Math.PI / 2.0; // rotate so UP is 0 rad
      if (alpha < 0) alpha += 2.0 * Math.PI;

      // Determine 8-way directional label (45-degree sectors)
      const deg = (alpha * 180.0) / Math.PI;
      if (deg >= 337.5 || deg < 22.5) {
        setDirectionLabel('LOOKING UP');
      } else if (deg >= 22.5 && deg < 67.5) {
        setDirectionLabel('LOOKING UP-RIGHT');
      } else if (deg >= 67.5 && deg < 112.5) {
        setDirectionLabel('LOOKING RIGHT');
      } else if (deg >= 112.5 && deg < 157.5) {
        setDirectionLabel('LOOKING DOWN-RIGHT');
      } else if (deg >= 157.5 && deg < 202.5) {
        setDirectionLabel('LOOKING DOWN');
      } else if (deg >= 202.5 && deg < 247.5) {
        setDirectionLabel('LOOKING DOWN-LEFT');
      } else if (deg >= 247.5 && deg < 292.5) {
        setDirectionLabel('LOOKING LEFT');
      } else {
        setDirectionLabel('LOOKING UP-LEFT');
      }
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
      setDirectionLabel('CENTER');
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as unknown as { toElement?: Element }).toElement) {
        handleMouseLeave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleMouseLeave();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('blur', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('blur', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const isReady = loadedCount > 15;

  return (
    <div
      ref={containerRef}
      className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-900/5 lg:bg-transparent"
      aria-hidden="true"
    >
      {/* 60-120+ FPS Hardware-Accelerated 360° Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Cybernetic Telemetry Badge */}
      <div
        className={`absolute bottom-6 right-6 hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-[#4D6D47]/40 text-emerald-400 font-mono text-xs tracking-wider transition-opacity duration-500 z-10 select-none shadow-xl ${
          isReady ? 'opacity-90' : 'opacity-0'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[#A8BFA5] font-semibold text-[11px]">360° NEURAL GAZE:</span>
        <span className="text-white font-bold text-[11px]">{directionLabel}</span>
      </div>

      {/* Video Element Specification Fallback */}
      <video
        ref={videoRef}
        src={FALLBACK_VIDEO_URL}
        muted
        playsInline
        autoPlay
        loop
        preload="auto"
        className={`w-full h-full object-cover object-center ${
          isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />
    </div>
  );
};
