import React, { useEffect, useRef, useState } from 'react';

export default function HoloGlobe({ lat, lon, color }: { lat: number, lon: number, color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<[number, number, number][] | null>(null);

  useEffect(() => {
    // Attempt to load world.json from the public folder
    fetch('/world.json')
      .then(res => {
        if (!res.ok) throw new Error('world.json not found');
        return res.json();
      })
      .then(data => {
        const radius = 180;
        const parsedPoints: [number, number, number][] = [];
        
        const addPoint = (pLat: number, pLon: number) => {
          const phi = (90 - pLat) * (Math.PI / 180);
          const theta = pLon * (Math.PI / 180);
          parsedPoints.push([
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.cos(theta)
          ]);
        };

        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          data.features.forEach((feature: any) => {
            if (!feature.geometry || !feature.geometry.coordinates) return;
            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;
            
            const processLineString = (line: any[]) => {
              line.forEach(pt => {
                if (Array.isArray(pt) && pt.length >= 2) {
                  addPoint(pt[1], pt[0]); // GeoJSON is [lon, lat]
                }
              });
            };

            if (type === 'Polygon') {
              coords.forEach(processLineString);
            } else if (type === 'MultiPolygon') {
              coords.forEach((polygon: any[]) => {
                polygon.forEach(processLineString);
              });
            } else if (type === 'LineString') {
              processLineString(coords);
            } else if (type === 'MultiLineString') {
              coords.forEach(processLineString);
            } else if (type === 'Point') {
              addPoint(coords[1], coords[0]);
            }
          });
        } else if (Array.isArray(data)) {
          data.forEach((point: any) => {
            if (Array.isArray(point) && point.length >= 2) {
              addPoint(point[0], point[1]);
            } else if (point && typeof point.lat === 'number' && typeof point.lon === 'number') {
              addPoint(point.lat, point.lon);
            }
          });
        }
        
        if (parsedPoints.length > 0) {
          setWorldData(parsedPoints);
        }
      })
      .catch(err => {
        console.log('Using fallback random globe points. Upload world.json to public/ to use custom coordinates.', err.message);
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleY = 0;
    
    const radius = 180;
    let points: [number, number, number][] = [];
    
    if (worldData) {
      points = worldData;
    } else {
      // Generate fallback sphere points
      for (let i = 0; i < 500; i++) {
        const phi = Math.acos(1 - 2 * Math.random());
        const theta = Math.random() * 2 * Math.PI;
        points.push([
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.cos(theta)
        ]);
      }
    }

    const render = () => {
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      
      angleY += 0.005;
      
      // Draw ocean
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0, 50, 50, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0.4)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw points
      ctx.fillStyle = color;
      points.forEach(([x, y, z]) => {
        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        
        const scale = 800 / (800 - z1);
        const px = cx + x1 * scale;
        const py = cy - y * scale;

        if (!isFinite(px) || !isFinite(py)) return;

        if (z1 > 0) {
          ctx.globalAlpha = 0.8;
          ctx.fillRect(px, py, 2, 2);
        } else {
          ctx.globalAlpha = 0.2;
          ctx.fillRect(px, py, 1, 1);
        }
      });
      ctx.globalAlpha = 1.0;

      // Draw Target
      const validLat = Number(lat) || 0;
      const validLon = Number(lon) || 0;
      
      if (validLat !== 0 || validLon !== 0) {
        const phi = (90 - validLat) * (Math.PI / 180);
        const theta = validLon * (Math.PI / 180);
        const tx = radius * Math.sin(phi) * Math.sin(theta);
        const ty = radius * Math.cos(phi);
        const tz = radius * Math.sin(phi) * Math.cos(theta);

        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
        const x1 = tx * cosY - tz * sinY;
        const z1 = tx * sinY + tz * cosY;
        
        const scale = 800 / (800 - z1);
        const px = cx + x1 * scale;
        const py = cy - ty * scale;

        if (z1 > -50 && isFinite(px) && isFinite(py)) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw target lines
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(px - 20, py);
          ctx.lineTo(px + 20, py);
          ctx.moveTo(px, py - 20);
          ctx.lineTo(px, py + 20);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [lat, lon, color, worldData]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
