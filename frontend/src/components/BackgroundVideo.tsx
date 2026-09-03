import React, { useEffect, useRef, useState } from 'react';

const FALLBACK_VIDEO_URL = '/robot_hero.mp4';
const TOTAL_FRAMES = 193;

// Keyframe Landmarks from Robot_looking_in_directions_1080p_202609032148.mp4:
// - Frame 72: Neutral Center Forward (Horizontal baseline)
// - Frame 48: Peak Look Right (viewer's right)
// - Frame 96: Peak Look Left (viewer's left)
// - Frame 168: Neutral Center Forward (Vertical baseline)
// - Frame 144: Peak Look Up
// - Frame 188: Peak Look Down

type GazeAxis = 'H' | 'V';
type GazeDirection = 'CENTER' | 'LOOKING RIGHT' | 'LOOKING LEFT' | 'LOOKING UP' | 'LOOKING DOWN';

export const BackgroundVideo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mouse & Gaze Tracking State
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const idleTimerRef = useRef<number | null>(null);

  // Gaze Graph State Machine
  const currentAxisRef = useRef<GazeAxis>('H');
  const currentFrameRef = useRef<number>(72.0);
  const targetFrameRef = useRef<number>(72.0);
  const targetAxisRef = useRef<GazeAxis>('H');

  const [directionLabel, setDirectionLabel] = useState<GazeDirection>('CENTER');
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  // 1. Preload 193 High-Definition Video Frames into Memory
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

  // 2. High-Performance 60-120+ FPS Hardware-Accelerated Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let idleAngle = 0;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      const deltaMs = Math.min(32, time - lastTime);
      lastTime = time;

      const isMobile = window.innerWidth < 1024;
      const isMouseActive = mousePosRef.current.active;

      if (isMobile || !isMouseActive) {
        // Ambient Autonomous Gaze Movement (Gently scans when idle or on mobile)
        idleAngle += deltaMs * 0.0008;
        const ambientX = Math.sin(idleAngle) * 0.45;
        const ambientY = Math.cos(idleAngle * 0.7) * 0.25;

        // Map ambient motion to target
        if (Math.abs(ambientX) >= Math.abs(ambientY)) {
          targetAxisRef.current = 'H';
          if (ambientX > 0) {
            targetFrameRef.current = 72.0 - ambientX * 24.0; // Right
          } else {
            targetFrameRef.current = 72.0 + Math.abs(ambientX) * 24.0; // Left
          }
        } else {
          targetAxisRef.current = 'V';
          if (ambientY < 0) {
            targetFrameRef.current = 168.0 - Math.abs(ambientY) * 24.0; // Up
          } else {
            targetFrameRef.current = 168.0 + ambientY * 20.0; // Down
          }
        }
      }

      // Step along Gaze Graph State Machine
      const curAxis = currentAxisRef.current;
      const tgtAxis = targetAxisRef.current;
      const tgtFrame = targetFrameRef.current;

      if (curAxis === tgtAxis) {
        // Moving along same axis: Smooth exponential physics damping
        const diff = tgtFrame - currentFrameRef.current;
        if (Math.abs(diff) > 0.01) {
          currentFrameRef.current += diff * 0.16;
        } else {
          currentFrameRef.current = tgtFrame;
        }
      } else {
        // Cross-axis transition: Traverse through Center neutral hub first
        const centerFrame = curAxis === 'H' ? 72.0 : 168.0;
        const diff = centerFrame - currentFrameRef.current;

        if (Math.abs(diff) < 2.5) {
          // At Center: Seamlessly switch baseline to opposite axis Center
          currentAxisRef.current = tgtAxis;
          currentFrameRef.current = tgtAxis === 'H' ? 72.0 : 168.0;
        } else {
          // Lerp towards Center hub
          currentFrameRef.current += diff * 0.22;
        }
      }

      // Render Active Frame to Canvas
      const canvas = canvasRef.current;
      const images = imagesRef.current;

      if (!canvas || images.length === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;

      const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(currentFrameRef.current)));
      const img = images[clampedFrame - 1];

      if (img && img.complete && img.naturalWidth > 0) {
        const cWidth = canvas.width;
        const cHeight = canvas.height;
        const iWidth = img.naturalWidth;
        const iHeight = img.naturalHeight;

        // Object-cover calculation with center-right bias for optimal desktop hero composition
        const scale = Math.max(cWidth / iWidth, cHeight / iHeight);
        const drawWidth = iWidth * scale;
        const drawHeight = iHeight * scale;

        // Position on desktop: slightly towards right half to frame next to hero text
        let x: number;
        if (cWidth >= 1024) {
          x = cWidth - drawWidth * 0.85; // Focus face towards center-right
          if (x > 0) x = 0;
          if (x + drawWidth < cWidth) x = cWidth - drawWidth;
        } else {
          // Mobile & Tablet: Center horizontally
          x = (cWidth - drawWidth) * 0.5;
        }

        const y = Math.min(0, (cHeight - drawHeight) * 0.25); // Keep head near upper-center

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

  // 4. Interactive 2D Cursor Gaze Synchronization
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
      }, 3500);

      // Calculate normalized coordinates [-1, 1] relative to viewport center
      const centerX = window.innerWidth * 0.5;
      const centerY = window.innerHeight * 0.5;

      const nx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth * 0.45)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight * 0.45)));

      mousePosRef.current.x = nx;
      mousePosRef.current.y = ny;

      const r = Math.hypot(nx, ny);

      // Deadzone near center (robot looks straight forward at user)
      if (r < 0.12) {
        targetFrameRef.current = currentAxisRef.current === 'H' ? 72.0 : 168.0;
        setDirectionLabel('CENTER');
        return;
      }

      // Hysteresis calculation to prevent diagonal chatter
      const curAxis = currentAxisRef.current;
      const ratio = Math.abs(nx) / (Math.abs(ny) + 0.001);

      let chosenAxis: GazeAxis = curAxis;
      if (curAxis === 'H') {
        if (ratio < 0.85) chosenAxis = 'V';
      } else {
        if (ratio > 1.15) chosenAxis = 'H';
      }

      targetAxisRef.current = chosenAxis;

      if (chosenAxis === 'H') {
        const intensity = Math.min(1, Math.abs(nx));
        if (nx > 0) {
          // Cursor to the right -> Robot looks right (Frame 72 -> Frame 48)
          targetFrameRef.current = 72.0 - intensity * 24.0;
          setDirectionLabel('LOOKING RIGHT');
        } else {
          // Cursor to the left -> Robot looks left (Frame 72 -> Frame 96)
          targetFrameRef.current = 72.0 + intensity * 24.0;
          setDirectionLabel('LOOKING LEFT');
        }
      } else {
        const intensity = Math.min(1, Math.abs(ny));
        if (ny < 0) {
          // Cursor upwards -> Robot looks up (Frame 168 -> Frame 144)
          targetFrameRef.current = 168.0 - intensity * 24.0;
          setDirectionLabel('LOOKING UP');
        } else {
          // Cursor downwards -> Robot looks down (Frame 168 -> Frame 188)
          targetFrameRef.current = 168.0 + intensity * 20.0;
          setDirectionLabel('LOOKING DOWN');
        }
      }
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
      targetFrameRef.current = currentAxisRef.current === 'H' ? 72.0 : 168.0;
      setDirectionLabel('CENTER');
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
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
      {/* 60-120+ FPS Hardware-Accelerated Canvas Layer */}
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
        <span className="text-[#A8BFA5] font-semibold text-[11px]">NEURAL GAZE:</span>
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
