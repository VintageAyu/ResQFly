import React, { useMemo } from 'react';
import { generateHudFrameSVG } from '../lib/hudFrameGenerator';

interface HudFrameProps {
  width?: number;
  height?: number;
  seed?: number;
  themeColor?: string;
  children?: React.ReactNode;
  className?: string;
  corners?: { tl: number, tr: number, br: number, bl: number };
}

export const HudFrame: React.FC<HudFrameProps> = ({
  width = 400,
  height = 300,
  seed = 898766,
  themeColor = 'rgba(18, 168, 255, 0.95)',
  children,
  className = '',
  corners,
}) => {
  const { svgMarkup } = useMemo(() => {
    const base = generateHudFrameSVG({
      w: width,
      h: height,
      seed: seed,
      pad: 22,
      strokeOuter: themeColor,
      accentFill: themeColor.replace('0.95', '0.55'),
      accentStroke: themeColor.replace('0.95', '0.78'),
      corners,
    });
    return base;
  }, [width, height, seed, themeColor]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <div 
        className="absolute inset-0 pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <div className="relative z-10 w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};
