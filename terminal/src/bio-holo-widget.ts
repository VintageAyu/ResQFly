// =============================================================================
// RESQFLY CONSOLE — HOLOGRAPHIC 3D MESH WIDGET (TypeScript Port)
// =============================================================================
// Renders the BIO tab: 3D holographic wireframe mesh, glowing laser scan lines,
// floor grid circles, and HUD diagnostics card.
// =============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Edge {
  v1: number;
  v2: number;
}

class BioModel {
  vertices: Point3D[] = [];
  targets: Point3D[] = [];
  edges: Edge[] = [];
  angleY: number = 0;
  scanPhase: number = 0;
  loaded: boolean = false;
  totalVerts: number = 0;
  totalEdges: number = 0;
  subjectName: string = 'DRONE_AIRFRAME_V4.OBJ';

  constructor() {
    this.generateSyntheticModel();
  }

  generateSyntheticModel(): void {
    // Generate a sleek human/drone high-density holographic wireframe
    const verts: Point3D[] = [];
    const edgeSet = new Set<string>();

    const addEdge = (i1: number, i2: number) => {
      const min = Math.min(i1, i2);
      const max = Math.max(i1, i2);
      edgeSet.add(`${min}_${max}`);
    };

    // Body rings (torso / fuselage)
    const rings = 18;
    const segments = 16;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const y = (t - 0.5) * 220;
      // Airframe profile curve
      const radius = Math.sin(t * Math.PI) * (45 + Math.sin(t * Math.PI * 3) * 12);

      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius * 0.7; // elliptical
        verts.push({ x, y: -y, z });

        const idx = r * segments + s;
        // Connect along ring
        const nextS = (s + 1) % segments;
        addEdge(idx, r * segments + nextS);

        // Connect to prev ring
        if (r > 0) {
          addEdge(idx, (r - 1) * segments + s);
          // Diagonal lattice
          addEdge(idx, (r - 1) * segments + nextS);
        }
      }
    }

    // Wings / Arms
    for (const side of [-1, 1]) {
      const wingStartIdx = verts.length;
      for (let i = 0; i < 8; i++) {
        const wx = side * (50 + i * 18);
        const wy = -20 + Math.sin(i * 0.4) * 8;
        const wz = -i * 10;
        verts.push({ x: wx, y: wy, z: wz });
        verts.push({ x: wx, y: wy + 6, z: wz + 12 });

        const idx1 = wingStartIdx + i * 2;
        const idx2 = idx1 + 1;
        addEdge(idx1, idx2);
        if (i > 0) {
          addEdge(idx1, idx1 - 2);
          addEdge(idx2, idx2 - 2);
          addEdge(idx1, idx2 - 2);
        }
      }
    }

    this.targets = verts.map((v) => ({ ...v }));
    // Start with scattered particles that assemble together
    this.vertices = verts.map(() => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      z: (Math.random() - 0.5) * 800,
    }));

    this.edges = Array.from(edgeSet).map((str) => {
      const [v1, v2] = str.split('_').map(Number);
      return { v1, v2 };
    });

    this.totalVerts = this.vertices.length;
    this.totalEdges = this.edges.length;
    this.loaded = true;
  }

  update(): void {
    if (!this.loaded) return;
    this.angleY += 0.012;

    // Particle assembly interpolation
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const t = this.targets[i];
      v.x += (t.x - v.x) * 0.08;
      v.y += (t.y - v.y) * 0.08;
      v.z += (t.z - v.z) * 0.08;
    }

    this.scanPhase = (this.scanPhase + 0.025) % (Math.PI * 2);
  }
}

const bioModel = new BioModel();

export function drawBioHoloWidget(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  bioModel.update();

  // Solid deep pitch-black background
  ctx.fillStyle = 'rgb(4, 4, 6)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 15;

  // 1. Holographic Floor Grid Rings
  const gridY = cy + 155;
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.12)';
  ctx.lineWidth = 1;
  for (const r of [60, 120, 180, 240]) {
    ctx.beginPath();
    ctx.ellipse(cx, gridY, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Floor grid axis line
  ctx.strokeStyle = 'rgba(255, 35, 50, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - 250, gridY);
  ctx.lineTo(cx + 250, gridY);
  ctx.stroke();

  // 2. Tactical Diagnostics HUD Card (Top-Left)
  drawBioHudCard(ctx, 24, 20, 310, 110, bioModel);

  // 3. Project 3D Points & Rotate
  const cosY = Math.cos(bioModel.angleY);
  const sinY = Math.sin(bioModel.angleY);
  const dist = 600;

  const projX: number[] = [];
  const projY: number[] = [];
  const modelY: number[] = [];

  for (let i = 0; i < bioModel.vertices.length; i++) {
    const v = bioModel.vertices[i];
    const rx = v.x * cosY - v.z * sinY;
    const rz = v.x * sinY + v.z * cosY;
    const ry = v.y;

    const denom = Math.max(1, dist - rz);
    const scale = dist / denom;

    projX.push(rx * scale + cx);
    projY.push(-ry * scale + cy);
    modelY.push(ry);
  }

  // Laser scanning band
  const scanYModel = Math.sin(bioModel.scanPhase) * 120;
  const bandSize = 22;

  // Draw Edges
  for (const edge of bioModel.edges) {
    const { v1, v2 } = edge;
    const p1x = projX[v1], p1y = projY[v1];
    const p2x = projX[v2], p2y = projY[v2];

    const yMid = (modelY[v1] + modelY[v2]) / 2;
    const inScan = Math.abs(yMid - scanYModel) < bandSize;

    if (inScan) {
      // Glowing scan line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    } else {
      // Normal cyan wireframe
      ctx.strokeStyle = 'rgba(0, 230, 255, 0.55)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }
  }
}

function drawBioHudCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  model: BioModel
): void {
  // Card background
  ctx.fillStyle = 'rgba(10, 8, 12, 0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 35, 50, 0.63)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);

  // Corner Cyber Accents
  ctx.strokeStyle = 'rgb(255, 55, 70)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(x, y + 12); ctx.lineTo(x, y); ctx.lineTo(x + 12, y);
  ctx.moveTo(x + w - 12, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - 12);
  ctx.stroke();

  // Typography
  ctx.font = 'bold 9px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(255, 55, 70)';
  ctx.textAlign = 'left';
  ctx.fillText('BIO-SCAN // 3D HOLOGRAPHIC MESH', x + 12, y + 18);

  ctx.font = 'bold 8px Orbitron, sans-serif';
  ctx.fillStyle = 'rgb(0, 240, 255)';
  ctx.fillText(`SUBJECT: ${model.subjectName}`, x + 12, y + 36);

  ctx.font = '8px Consolas, monospace';
  ctx.fillStyle = 'rgb(180, 200, 210)';
  ctx.fillText(`VERTICES: ${model.totalVerts.toLocaleString()}  |  EDGES: ${model.totalEdges.toLocaleString()}`, x + 12, y + 54);
  ctx.fillText('ENGINE: WEBGL ACCELERATED CANVAS', x + 12, y + 70);
  ctx.fillText('SCANNER STATUS: LOCKED [60 FPS]', x + 12, y + 86);
}
