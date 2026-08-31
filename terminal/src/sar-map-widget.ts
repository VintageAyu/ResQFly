// =============================================================================
// RESQFLY CONSOLE — SAR TACTICAL MAP WIDGET (TypeScript Port)
// =============================================================================

import type { TelemetryData } from './types';

const SAR_GRID: [number, number][] = [];
let sarGridGenerated = false;

function generateSarGrid(centerLat: number, centerLon: number, radiusM: number, laneWidthM: number): void {
  if (sarGridGenerated) return;
  sarGridGenerated = true;

  const latPerM = 1.0 / 111132.0;
  const lonPerM = 1.0 / (111132.0 * Math.cos(centerLat * Math.PI / 180));
  const halfR = radiusM;
  const numLanes = Math.max(2, Math.floor((halfR * 2) / laneWidthM));

  SAR_GRID.length = 0;
  for (let i = 0; i <= numLanes; i++) {
    const xOff = -halfR + i * laneWidthM;
    const lon = centerLon + xOff * lonPerM;
    if (i % 2 === 0) {
      SAR_GRID.push([centerLat - halfR * latPerM, lon]);
      SAR_GRID.push([centerLat + halfR * latPerM, lon]);
    } else {
      SAR_GRID.push([centerLat + halfR * latPerM, lon]);
      SAR_GRID.push([centerLat - halfR * latPerM, lon]);
    }
  }
}

function latLonToScreen(lat: number, lon: number, viewLat: number, viewLon: number, zoom: number, w: number, h: number): { x: number; y: number } {
  const n = Math.pow(2, Math.floor(zoom));
  const latRad = lat * Math.PI / 180;
  const x = ((lon + 180) / 360) * n;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

  const cLatRad = viewLat * Math.PI / 180;
  const cx = ((viewLon + 180) / 360) * n;
  const cy = (1 - Math.log(Math.tan(cLatRad) + 1 / Math.cos(cLatRad)) / Math.PI) / 2 * n;

  const scale = Math.pow(2, zoom - Math.floor(zoom));
  const dx = (x - cx) * 256 * scale;
  const dy = (y - cy) * 256 * scale;

  return { x: w / 2 + dx, y: h / 2 + dy };
}

export function drawSarMapWidget(ctx: CanvasRenderingContext2D, w: number, h: number, telem: TelemetryData): void {
  const t = performance.now() / 1000;

  generateSarGrid(telem.lat, telem.lon, 600, 80);

  // Dark map background
  ctx.fillStyle = 'rgb(18,18,22)';
  ctx.fillRect(0, 0, w, h);

  const viewLat = telem.lat;
  const viewLon = telem.lon;
  const zoom = 15;

  // Grid lines
  ctx.strokeStyle = 'rgba(0,240,255,0.07)';
  ctx.lineWidth = 1;
  ctx.setLineDash([1, 4]);
  for (let gx = 0; gx < w; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Geofence ring
  const gc = latLonToScreen(telem.lat, telem.lon, viewLat, viewLon, zoom, w, h);
  const geofenceRadiusM = 1200;
  const edgeLat = telem.lat + geofenceRadiusM / 111132;
  const ge = latLonToScreen(edgeLat, telem.lon, viewLat, viewLon, zoom, w, h);
  const gr = Math.abs(gc.y - ge.y);
  if (gr > 5) {
    ctx.strokeStyle = 'rgba(0,255,157,0.31)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(gc.x, gc.y, gr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,255,157,0.03)';
    ctx.fill();
  }

  // SAR grid lines
  if (SAR_GRID.length > 1) {
    ctx.strokeStyle = 'rgba(0,240,255,0.47)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const first = latLonToScreen(SAR_GRID[0][0], SAR_GRID[0][1], viewLat, viewLon, zoom, w, h);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < SAR_GRID.length; i++) {
      const pt = latLonToScreen(SAR_GRID[i][0], SAR_GRID[i][1], viewLat, viewLon, zoom, w, h);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Waypoint dots
    for (let i = 0; i < SAR_GRID.length; i++) {
      const pt = latLonToScreen(SAR_GRID[i][0], SAR_GRID[i][1], viewLat, viewLon, zoom, w, h);
      ctx.fillStyle = i === 0 ? 'rgba(255,200,0,0.86)' : 'rgba(0,240,255,0.55)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Drone marker
  const dronePt = latLonToScreen(telem.lat, telem.lon, viewLat, viewLon, zoom, w, h);

  // Heading arrow
  const headingRad = telem.heading * Math.PI / 180;
  const arrowLen = 28;
  ctx.save();
  ctx.translate(dronePt.x, dronePt.y);
  ctx.rotate(headingRad);

  // Arrow body
  ctx.strokeStyle = 'rgba(255,35,50,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -arrowLen);
  ctx.lineTo(-8, 8);
  ctx.lineTo(0, 2);
  ctx.lineTo(8, 8);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,35,50,0.6)';
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // Pulse ring around drone
  const pulseR = 12 + Math.sin(t * 4) * 4;
  ctx.strokeStyle = `rgba(255,35,50,${0.3 + Math.sin(t * 4) * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(dronePt.x, dronePt.y, pulseR, 0, Math.PI * 2);
  ctx.stroke();

  // HUD overlay
  ctx.fillStyle = 'rgba(4,4,6,0.75)';
  ctx.fillRect(8, 8, 200, 90);
  ctx.strokeStyle = 'rgba(255,35,50,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 200, 90);

  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255,35,50)';
  ctx.textAlign = 'left';
  ctx.fillText('TACTICAL SAR MAP', 14, 24);

  ctx.font = '8px Consolas, monospace';
  ctx.fillStyle = 'rgb(245,240,242)';
  ctx.fillText(`LAT: ${telem.lat.toFixed(6)}`, 14, 40);
  ctx.fillText(`LON: ${telem.lon.toFixed(6)}`, 14, 52);
  ctx.fillText(`ALT: ${telem.alt.toFixed(1)} m AGL`, 14, 64);
  ctx.fillText(`HDG: ${Math.round(telem.heading)}°`, 14, 76);
  ctx.fillText(`SAR WPs: ${SAR_GRID.length}`, 14, 88);

  // Bottom status bar
  ctx.fillStyle = 'rgba(4,4,6,0.75)';
  ctx.fillRect(8, h - 28, w - 16, 22);
  ctx.strokeStyle = 'rgba(255,35,50,0.5)';
  ctx.strokeRect(8, h - 28, w - 16, 22);
  ctx.font = 'bold 8px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(0,255,157)';
  ctx.textAlign = 'center';
  ctx.fillText(`GEOFENCE ACTIVE • ${SAR_GRID.length} WAYPOINTS LOADED • SIMULATION MODE`, w / 2, h - 13);
}
