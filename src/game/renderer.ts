import { drawCharacterArtwork, drawItemArtwork, INK } from './artwork';
import { getRotatedSize, ITEM_MAP } from './catalog';
import {
  CHARACTERS,
  GRID_H,
  GRID_W,
  PLAYER_H,
  PLAYER_W,
  TILE,
  WORLD_H,
  WORLD_W,
} from './constants';
import {
  dirVector,
  getBlockRect,
  getFanRect,
  getFlameRect,
  getGoalRect,
  getPunchRect,
  getWreckingBallPos,
  rectsOverlap,
} from './physics';
import { STAGES, TREEHOUSE_STAGE } from './stages';
import {
  CursorState,
  GameSnapshot,
  ItemId,
  PlacedBlock,
  PlayerState,
  Rect,
  SimEvent,
  StageDef,
} from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

export class GameRenderer {
  private particles: Particle[] = [];
  private shakeTime = 0;
  private shakeIntensity = 0;
  private camX = WORLD_W / 2;
  private camY = WORLD_H / 2;
  private camZoom = 1;
  private timeAccum = 0;

  public handleEvents(events: SimEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'shake') {
        this.shakeTime = 0.25;
        this.shakeIntensity = ev.intensity ?? 8;
      } else if (ev.type === 'particle' && ev.x !== undefined && ev.y !== undefined) {
        this.spawnParticles(ev.particleKind ?? 'dust', ev.x, ev.y, ev.color);
      }
    }
  }

  private spawnParticles(
    kind: NonNullable<SimEvent['particleKind']>,
    x: number,
    y: number,
    customColor?: string
  ): void {
    const count = kind === 'explosion' ? 24 : kind === 'confetti' ? 28 : 10;
    const palette =
      kind === 'explosion'
        ? ['#FF7A00', '#E63946', '#FFD166', '#4A4E69']
        : kind === 'confetti'
          ? ['#E63946', '#2D7FF9', '#FFB703', '#2BB673', '#FF6B9D']
          : kind === 'feathers'
            ? ['#FFFDF7', '#FFE5EC', '#E63946']
            : kind === 'honey'
              ? ['#FFB703', '#FB8500', '#FFD166']
              : kind === 'stars'
                ? [customColor ?? '#FFD166', '#FFFDF7']
                : ['#D8CFC0', '#FFFDF7'];

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd =
        kind === 'explosion'
          ? 120 + Math.random() * 280
          : kind === 'confetti'
            ? 100 + Math.random() * 240
            : 50 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (kind === 'confetti' ? 140 : 40),
        size: kind === 'explosion' ? 6 + Math.random() * 8 : 4 + Math.random() * 5,
        color: palette[i % palette.length],
        life: 0.4 + Math.random() * 0.45,
        maxLife: 0.85,
        gravity: kind === 'feathers' ? 140 : 420,
      });
    }
  }

  public renderTitleDiorama(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    dt: number
  ): void {
    this.timeAccum += dt;
    const t = this.timeAccum;

    ctx.save();
    ctx.fillStyle = '#BDE0FE';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Cover-fit 1280x720 diorama across viewport
    const scale = Math.max(canvasW / WORLD_W, canvasH / WORLD_H);
    const ox = (canvasW - WORLD_W * scale) / 2;
    const oy = (canvasH - WORLD_H * scale) / 2;
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    this.drawBackground(ctx, STAGES.farm);
    this.drawStaticPlatforms(ctx, STAGES.farm);
    this.drawStartAndGoal(ctx, STAGES.farm);

    // Showcase live animated gimmicks
    const liftX = 560 + Math.sin(t * 1.4) * 110;
    drawItemArtwork(ctx, { itemId: 'wood_beam', x: 320, y: 600, w: 3 * TILE, h: TILE, time: t });
    drawItemArtwork(ctx, { itemId: 'spring_pad', x: 360, y: 560, w: TILE, h: TILE, time: t, previewDemo: true });
    drawItemArtwork(ctx, { itemId: 'moving_platform', x: liftX, y: 470, w: 2 * TILE, h: TILE, time: t });
    drawItemArtwork(ctx, { itemId: 'saw_blade', x: 740, y: 580, w: TILE, h: TILE, time: t, previewDemo: true });
    drawItemArtwork(ctx, { itemId: 'fan', x: 980, y: 560, w: TILE, h: TILE, rot: 3, time: t, previewDemo: true });
    drawItemArtwork(ctx, { itemId: 'coin', x: 1120, y: 360, w: TILE, h: TILE, time: t });
    drawItemArtwork(ctx, { itemId: 'crossbow', x: 1220, y: 430, w: TILE, h: TILE, rot: 2, time: t, previewDemo: true });

    // Showcase 6 animals playfully moving & dancing
    drawCharacterArtwork(ctx, {
      character: 'chicken',
      cx: 160 + Math.sin(t * 1.6) * 50,
      bottomY: 18 * TILE - Math.abs(Math.sin(t * 4.5)) * 28,
      facing: Math.cos(t * 1.6) >= 0 ? 1 : -1,
      time: t,
      vx: 100,
    });
    drawCharacterArtwork(ctx, {
      character: 'horse',
      cx: 380,
      bottomY: 565 - Math.abs(Math.sin(t * 3.1)) * 85,
      facing: 1,
      time: t,
      onGround: false,
    });
    drawCharacterArtwork(ctx, {
      character: 'sheep',
      cx: liftX + TILE,
      bottomY: 470,
      facing: 1,
      time: t,
      dancing: true,
    });
    drawCharacterArtwork(ctx, {
      character: 'raccoon',
      cx: 760 + Math.cos(t * 1.2) * 45,
      bottomY: 16 * TILE,
      facing: -1,
      time: t,
      vx: 80,
    });
    drawCharacterArtwork(ctx, {
      character: 'fox',
      cx: 1000,
      bottomY: 520 - Math.abs(Math.sin(t * 2.5)) * 65,
      facing: 1,
      time: t,
      onGround: false,
    });
    drawCharacterArtwork(ctx, {
      character: 'platypus',
      cx: 1380,
      bottomY: 9 * TILE,
      facing: -1,
      time: t,
      dancing: true,
    });

    ctx.restore();
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    snapshot: GameSnapshot,
    localPlayerId: string,
    localCursor: CursorState,
    canPlaceLocal: boolean,
    dt: number
  ): void {
    this.timeAccum += dt;
    this.updateParticles(dt);
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);

    const stage: StageDef =
      snapshot.phase === 'LOBBY' ? TREEHOUSE_STAGE : STAGES[snapshot.stageId];

    this.updateCamera(snapshot, stage, dt);

    ctx.save();
    ctx.fillStyle = '#1D1B1A';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const baseScale = Math.min(canvasW / WORLD_W, canvasH / WORLD_H);
    const totalScale = baseScale * this.camZoom;
    const shakeX = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;
    const shakeY = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;

    ctx.translate(canvasW / 2 + shakeX, canvasH / 2 + shakeY);
    ctx.scale(totalScale, totalScale);
    ctx.translate(-this.camX, -this.camY);

    ctx.beginPath();
    ctx.rect(0, 0, WORLD_W, WORLD_H);
    ctx.clip();

    // 1. Rich Stage Background
    this.drawBackground(ctx, stage);

    // 2. Build Grid
    if (snapshot.phase === 'PLACE' && !snapshot.freeplayTesting) {
      this.drawGrid(ctx, stage);
    }

    // 3. Static platforms with hand-crafted edge trims
    this.drawStaticPlatforms(ctx, stage);

    // 4. Windmill blades
    this.drawWindmill(ctx, stage, snapshot);

    // 5. Start & Goal
    if (snapshot.phase !== 'LOBBY') {
      this.drawStartAndGoal(ctx, stage);
    }

    // 6. Placed blocks & trap guides
    for (const block of snapshot.blocks) {
      this.drawBlockGuides(ctx, block, snapshot.phase);
    }
    for (const block of snapshot.blocks) {
      drawItemArtwork(ctx, {
        itemId: block.itemId,
        x: block.x,
        y: block.y,
        w: block.w * TILE,
        h: block.h * TILE,
        rot: block.rot,
        flipX: block.flipX,
        time: this.timeAccum,
        state: block.state,
        angle: block.angle,
        honeyed: block.honeyed,
      });
    }

    // 7. Projectiles
    for (const pr of snapshot.projectiles) {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      if (pr.kind === 'arrow') {
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = '#8D5524';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.fillRect(-12, -2.5, 22, 5);
        ctx.strokeRect(-12, -2.5, 22, 5);
        ctx.fillStyle = '#E63946';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(5, -6);
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (pr.kind === 'fireball') {
        ctx.fillStyle = '#FF7A00';
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFD166';
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (pr.kind === 'plane') {
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = '#FFFDF7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-9, -7);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-9, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (pr.kind === 'bee') {
        const wingY = Math.sin(this.timeAccum * 40) * 3;
        ctx.fillStyle = '#E0FBFC';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(-2, -6 + wingY, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFB703';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.fillRect(-3, -5, 2.5, 10);
        ctx.fillRect(1.5, -5, 2.5, 10);
      } else {
        ctx.fillStyle = '#231F20';
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Players
    for (const p of snapshot.players) {
      if (snapshot.phase === 'PLACE' || snapshot.phase === 'BOX_PICK') continue;
      this.drawPlayer(ctx, p, p.id === localPlayerId);
    }

    // 9. Rising Lava (Volcano)
    if (stage.risingLava && snapshot.phase === 'ACTION') {
      this.drawLava(ctx, snapshot.lavaY);
    }

    // 10. Build phase previews & cursors
    if (snapshot.phase === 'PLACE' && !snapshot.freeplayTesting) {
      this.drawCursors(ctx, snapshot, localPlayerId, localCursor, canPlaceLocal);
    }

    // 11. Particles
    for (const pt of this.particles) {
      const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private updateCamera(snapshot: GameSnapshot, stage: StageDef, dt: number): void {
    let targetX = WORLD_W / 2;
    let targetY = WORLD_H / 2;
    let targetZoom = 1.0;

    if (snapshot.phase === 'ACTION' && snapshot.players.length > 0) {
      const active = snapshot.players.filter((p) => p.alive && !p.finished);
      if (active.length > 0) {
        let minX = stage.goalPoint.x;
        let maxX = stage.goalPoint.x;
        let minY = stage.goalPoint.y;
        let maxY = stage.goalPoint.y;
        for (const p of active) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x + PLAYER_W);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y + PLAYER_H);
        }
        const spanW = maxX - minX + 320;
        const spanH = maxY - minY + 240;
        targetZoom = Math.max(1.0, Math.min(1.16, Math.min(WORLD_W / spanW, WORLD_H / spanH)));
        const halfW = WORLD_W / (2 * targetZoom);
        const halfH = WORLD_H / (2 * targetZoom);
        targetX = Math.max(halfW, Math.min(WORLD_W - halfW, (minX + maxX) / 2));
        targetY = Math.max(halfH, Math.min(WORLD_H - halfH, (minY + maxY) / 2));
      }
    }

    const lerp = Math.min(1, dt * 4.5);
    this.camX += (targetX - this.camX) * lerp;
    this.camY += (targetY - this.camY) * lerp;
    this.camZoom += (targetZoom - this.camZoom) * lerp;
  }

  private drawBackground(ctx: CanvasRenderingContext2D, stage: StageDef): void {
    const t = this.timeAccum;
    if (stage.theme === 'farm') {
      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grad.addColorStop(0, '#9AD1F5');
      grad.addColorStop(0.65, '#D8F3DC');
      grad.addColorStop(1, '#EAF4D3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Warm sun glow
      ctx.fillStyle = 'rgba(255, 225, 130, 0.55)';
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.82, 120, 64, 0, Math.PI * 2);
      ctx.fill();

      // Far hill
      ctx.fillStyle = '#B7DF9B';
      ctx.beginPath();
      ctx.moveTo(0, WORLD_H * 0.7);
      ctx.quadraticCurveTo(WORLD_W * 0.28, WORLD_H * 0.54, WORLD_W * 0.56, WORLD_H * 0.68);
      ctx.quadraticCurveTo(WORLD_W * 0.82, WORLD_H * 0.78, WORLD_W, WORLD_H * 0.6);
      ctx.lineTo(WORLD_W, WORLD_H);
      ctx.lineTo(0, WORLD_H);
      ctx.closePath();
      ctx.fill();

      // Near hill
      ctx.fillStyle = '#99CE7E';
      ctx.beginPath();
      ctx.moveTo(0, WORLD_H * 0.82);
      ctx.quadraticCurveTo(WORLD_W * 0.34, WORLD_H * 0.7, WORLD_W * 0.64, WORLD_H * 0.8);
      ctx.quadraticCurveTo(WORLD_W * 0.86, WORLD_H * 0.86, WORLD_W, WORLD_H * 0.74);
      ctx.lineTo(WORLD_W, WORLD_H);
      ctx.lineTo(0, WORLD_H);
      ctx.closePath();
      ctx.fill();

      // Distant barn with white cross door & silo
      const barnY = WORLD_H - 295;
      ctx.fillStyle = '#E07A5F';
      ctx.fillRect(190, barnY, 146, 125);
      ctx.fillStyle = '#F2CC8F';
      ctx.fillRect(336, barnY - 15, 38, 140);
      ctx.beginPath();
      ctx.arc(355, barnY - 15, 19, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#B54B35';
      ctx.beginPath();
      ctx.moveTo(174, barnY);
      ctx.lineTo(263, barnY - 64);
      ctx.lineTo(352, barnY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFF8EC';
      ctx.lineWidth = 3;
      ctx.strokeRect(234, barnY + 48, 58, 74);
      ctx.beginPath();
      ctx.moveTo(234, barnY + 48);
      ctx.lineTo(292, barnY + 122);
      ctx.moveTo(292, barnY + 48);
      ctx.lineTo(234, barnY + 122);
      ctx.stroke();

      // Fence posts
      ctx.fillStyle = 'rgba(221, 161, 94, 0.65)';
      ctx.fillRect(520, WORLD_H - 182, 260, 8);
      for (let fx = 532; fx <= 760; fx += 40) {
        ctx.fillRect(fx, WORLD_H - 200, 8, 40);
      }
    } else if (stage.theme === 'rooftops') {
      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grad.addColorStop(0, '#F4845F');
      grad.addColorStop(0.55, '#F7B267');
      grad.addColorStop(1, '#F6D6AD');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Sunset sun
      ctx.fillStyle = 'rgba(255, 241, 168, 0.7)';
      ctx.beginPath();
      ctx.arc(WORLD_W / 2, WORLD_H * 0.4, 110, 0, Math.PI * 2);
      ctx.fill();

      // Distant city skyline with glowing windows
      const buildings = [
        { x: 20, w: 140, h: 350 },
        { x: 180, w: 165, h: 460 },
        { x: 365, w: 135, h: 290 },
        { x: 520, w: 175, h: 520 },
        { x: 715, w: 155, h: 370 },
        { x: 890, w: 170, h: 470 },
        { x: 1080, w: 145, h: 330 },
        { x: 1245, w: 165, h: 430 },
        { x: 1430, w: 150, h: 360 },
      ];
      for (const b of buildings) {
        ctx.fillStyle = 'rgba(84, 73, 94, 0.34)';
        ctx.fillRect(b.x, WORLD_H - b.h, b.w, b.h);
        ctx.fillRect(b.x + b.w / 2 - 2, WORLD_H - b.h - 28, 4, 28);
        ctx.fillStyle = 'rgba(255, 225, 130, 0.45)';
        for (let wy = WORLD_H - b.h + 22; wy < WORLD_H - 44; wy += 30) {
          for (let wx = b.x + 18; wx < b.x + b.w - 22; wx += 26) {
            ctx.fillRect(wx, wy, 12, 16);
          }
        }
      }
    } else if (stage.theme === 'windmill') {
      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grad.addColorStop(0, '#90DBF4');
      grad.addColorStop(1, '#F1FAEE');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Rolling meadow
      ctx.fillStyle = '#B7E4C7';
      ctx.beginPath();
      ctx.moveTo(0, WORLD_H * 0.78);
      ctx.quadraticCurveTo(WORLD_W / 2, WORLD_H * 0.64, WORLD_W, WORLD_H * 0.78);
      ctx.lineTo(WORLD_W, WORLD_H);
      ctx.lineTo(0, WORLD_H);
      ctx.closePath();
      ctx.fill();

      // Stone windmill tower aligned with windmillHub
      const hubX = stage.windmillHub?.cx ?? WORLD_W / 2;
      const hubY = stage.windmillHub?.cy ?? WORLD_H / 2;
      ctx.fillStyle = '#E6CCB2';
      ctx.beginPath();
      ctx.moveTo(hubX - 78, WORLD_H - 100);
      ctx.lineTo(hubX - 44, hubY - 20);
      ctx.lineTo(hubX + 44, hubY - 20);
      ctx.lineTo(hubX + 78, WORLD_H - 100);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#D96B43';
      ctx.beginPath();
      ctx.arc(hubX, hubY - 20, 46, Math.PI, 0);
      ctx.fill();
    } else if (stage.theme === 'volcano') {
      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grad.addColorStop(0, '#231628');
      grad.addColorStop(1, '#612531');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Stalactites on ceiling
      ctx.fillStyle = '#362139';
      for (let sx = 40; sx < WORLD_W; sx += 110) {
        const sh = 46 + ((sx * 17) % 52);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 28, sh);
        ctx.lineTo(sx + 56, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Rising glowing embers
      ctx.fillStyle = 'rgba(255, 183, 3, 0.5)';
      for (let i = 0; i < 16; i++) {
        const ex = (i * 117 + Math.sin(t * 2 + i) * 18) % WORLD_W;
        const ey = WORLD_H - ((t * (42 + i * 5) + i * 70) % WORLD_H);
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Treehouse Lobby
      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      grad.addColorStop(0, '#C7F0D4');
      grad.addColorStop(1, '#FFF8DF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Sunbeams
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(260, 0);
      ctx.lineTo(430, 0);
      ctx.lineTo(640, WORLD_H);
      ctx.lineTo(390, WORLD_H);
      ctx.closePath();
      ctx.fill();

      // Tree trunk with bark lines
      const trunkX = WORLD_W / 2 - 120;
      ctx.fillStyle = '#C98A55';
      ctx.fillRect(trunkX, 70, 240, WORLD_H - 130);
      ctx.strokeStyle = 'rgba(92,52,20,0.22)';
      ctx.lineWidth = 4;
      for (let bx = trunkX + 34; bx <= trunkX + 206; bx += 42) {
        ctx.beginPath();
        ctx.moveTo(bx, 110);
        ctx.quadraticCurveTo(bx + 10, WORLD_H * 0.5, bx - 4, WORLD_H - 140);
        ctx.stroke();
      }

      // Leafy canopy
      ctx.fillStyle = '#80CE9E';
      [180, 480, 800, 1120, 1420].forEach((cx, idx) => {
        ctx.beginPath();
        ctx.arc(cx, 72 + (idx % 2) * 30, 200, 0, Math.PI * 2);
        ctx.fill();
      });

      // Festive triangular bunting garland
      const flagColors = ['#E63946', '#FFB703', '#2D7FF9', '#2BB673'];
      ctx.strokeStyle = '#5C3A21';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 230);
      ctx.quadraticCurveTo(WORLD_W / 2, 305, WORLD_W - 80, 230);
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const u = (i + 1) / 19;
        const fx = 80 + u * (WORLD_W - 160);
        const fy = 230 + Math.sin(u * Math.PI) * 37;
        ctx.fillStyle = flagColors[i % flagColors.length];
        ctx.beginPath();
        ctx.moveTo(fx - 13, fy);
        ctx.lineTo(fx + 13, fy);
        ctx.lineTo(fx, fy + 22);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Drifting clouds (except volcano)
    if (stage.theme !== 'volcano') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 340 + t * (10 + i * 3)) % (WORLD_W + 200)) - 100;
        const cy = 76 + (i % 2) * 56;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.arc(cx + 28, cy - 8, 34, 0, Math.PI * 2);
        ctx.arc(cx + 60, cy, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, stage: StageDef): void {
    ctx.save();
    ctx.strokeStyle = stage.theme === 'volcano' ? 'rgba(255,255,255,0.12)' : 'rgba(35,31,32,0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(WORLD_W, y * TILE);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStaticPlatforms(ctx: CanvasRenderingContext2D, stage: StageDef): void {
    for (const sp of stage.staticPlatforms) {
      if (sp.x < 0 || sp.x >= WORLD_W) continue;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.fillStyle =
        stage.theme === 'rooftops'
          ? '#6C757D'
          : stage.theme === 'volcano'
            ? '#4A314D'
            : '#8D5B4C';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sp.x, sp.y, sp.w, sp.h, 6);
      ctx.fill();

      // Pebbles / brick pattern
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      for (let px = sp.x + 18; px < sp.x + sp.w - 18; px += 46) {
        if (sp.h > 36) {
          ctx.beginPath();
          ctx.roundRect(px, sp.y + 24, 18, 9, 4);
          ctx.fill();
        }
      }

      // Top cap grass / roof edge
      ctx.fillStyle =
        stage.theme === 'rooftops'
          ? '#CED4DA'
          : stage.theme === 'volcano'
            ? '#9A4C62'
            : stage.theme === 'treehouse'
              ? '#E0A458'
              : '#52B788';
      ctx.beginPath();
      ctx.roundRect(sp.x, sp.y, sp.w, Math.min(16, sp.h), [6, 6, 3, 3]);
      ctx.fill();

      // Cute grass scallops on farm/windmill
      if (stage.theme === 'farm' || stage.theme === 'windmill') {
        for (let gx = sp.x + 14; gx < sp.x + sp.w - 10; gx += 26) {
          ctx.beginPath();
          ctx.arc(gx, sp.y + 15, 6, 0, Math.PI);
          ctx.fill();
        }
      }

      ctx.beginPath();
      ctx.roundRect(sp.x, sp.y, sp.w, sp.h, 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawWindmill(ctx: CanvasRenderingContext2D, stage: StageDef, snapshot: GameSnapshot): void {
    const hub = stage.windmillHub;
    if (!hub) return;
    ctx.save();
    ctx.strokeStyle = '#6F4E37';
    ctx.lineWidth = 7;
    for (const blade of snapshot.windmillBlades) {
      const bx = blade.x + blade.w / 2;
      const by = blade.y + blade.h / 2;
      ctx.beginPath();
      ctx.moveTo(hub.cx, hub.cy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.fillStyle = '#E09F3E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hub.cx, hub.cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const blade of snapshot.windmillBlades) {
      ctx.fillStyle = '#F4D58D';
      ctx.beginPath();
      ctx.roundRect(blade.x, blade.y, blade.w, blade.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(blade.x + 4, blade.y + 3, blade.w - 8, 5);
    }
    ctx.restore();
  }

  private drawStartAndGoal(ctx: CanvasRenderingContext2D, stage: StageDef): void {
    ctx.save();
    const sx = stage.startPoint.x;
    const sy = stage.startPoint.y;
    // Wooden signpost anchored on start platform
    ctx.fillStyle = '#8D5524';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.fillRect(sx - 3, sy - 24, 6, 24);
    ctx.strokeRect(sx - 3, sy - 24, 6, 24);
    ctx.fillStyle = '#6C757D';
    ctx.beginPath();
    ctx.roundRect(sx - 9, sy - 4, 18, 6, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2D7FF9';
    ctx.beginPath();
    ctx.roundRect(sx - 30, sy - 46, 60, 24, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', sx, sy - 30);

    // Goal flag anchored on goal platform
    const g = getGoalRect(stage);
    const gx = g.x + g.w / 2;
    const gy = g.y + g.h;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx - 8, gy);
    ctx.lineTo(gx - 8, g.y);
    ctx.stroke();

    // Base anchor plate on platform surface
    ctx.fillStyle = '#6C757D';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(gx - 18, gy - 4, 20, 6, 2);
    ctx.fill();
    ctx.stroke();

    // Flag finial
    ctx.fillStyle = '#FFB703';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx - 8, g.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const wave = Math.sin(this.timeAccum * 5) * 4;
    ctx.fillStyle = '#2BB673';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx - 8, g.y + 3);
    ctx.quadraticCurveTo(gx + 14, g.y + 8 + wave, gx + 32, g.y + 17);
    ctx.lineTo(gx - 8, g.y + 31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFDF7';
    ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('GOAL', gx + 10, g.y + 21);
    ctx.restore();
  }

  private drawBlockGuides(ctx: CanvasRenderingContext2D, b: PlacedBlock, phase: GameSnapshot['phase']): void {
    if (b.itemId === 'moving_platform' || b.itemId === 'moving_saw') {
      const { dx, dy } = dirVector(b.rot);
      const sx = b.gx * TILE + (b.w * TILE) / 2;
      const sy = b.gy * TILE + (b.h * TILE) / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(35,31,32,0.28)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx * 4 * TILE, sy + dy * 4 * TILE);
      ctx.stroke();
      ctx.restore();
    } else if (b.itemId === 'fan') {
      const zone = getFanRect(b);
      ctx.save();
      ctx.fillStyle = 'rgba(130, 210, 255, 0.2)';
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      const { dx, dy } = dirVector(b.rot);
      ctx.strokeStyle = 'rgba(45, 127, 249, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = (this.timeAccum * 120 + i * 55) % (4 * TILE);
        const lx = dx !== 0 ? (dx > 0 ? b.x + TILE + offset : b.x - offset) : b.x + 10 + i * 10;
        const ly = dy !== 0 ? (dy > 0 ? b.y + TILE + offset : b.y - offset) : b.y + 10 + i * 10;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + dx * 18, ly + dy * 18);
        ctx.stroke();
      }
      ctx.restore();
    } else if (b.itemId === 'flame_thrower' && phase === 'ACTION') {
      const flame = getFlameRect(b);
      if (flame) {
        ctx.save();
        ctx.fillStyle = '#FF7A00';
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(flame.x, flame.y, flame.w, flame.h, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFD166';
        ctx.beginPath();
        ctx.roundRect(flame.x + 4, flame.y + 5, Math.max(4, flame.w - 8), Math.max(4, flame.h - 10), 8);
        ctx.fill();
        ctx.restore();
      }
    } else if (b.itemId === 'punch_glove' && b.state === 'punching') {
      const pr = getPunchRect(b);
      ctx.save();
      ctx.fillStyle = '#E63946';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(pr.x, pr.y, pr.w, pr.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (b.itemId === 'wrecking_ball') {
      const wb = getWreckingBallPos(b, phase === 'ACTION' ? b.timer : this.timeAccum);
      ctx.save();
      ctx.strokeStyle = '#6C757D';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(wb.ax, wb.ay);
      ctx.lineTo(wb.bx, wb.by);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#2B2D42';
      ctx.beginPath();
      ctx.arc(wb.bx, wb.by, wb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E63946';
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + this.timeAccum * 0.5;
        ctx.beginPath();
        ctx.arc(wb.bx + Math.cos(a) * wb.radius, wb.by + Math.sin(a) * wb.radius, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (b.itemId === 'black_hole') {
      ctx.save();
      ctx.strokeStyle = 'rgba(157, 78, 221, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + TILE / 2, b.y + TILE / 2, 4.5 * TILE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, isLocal: boolean): void {
    const cx = p.x + PLAYER_W / 2;
    const bottomY = p.y + PLAYER_H;
    const wallSliding = !p.onGround && (p.onWallLeft || p.onWallRight) && p.vy > 30;

    drawCharacterArtwork(ctx, {
      character: p.character,
      cx,
      bottomY,
      facing: p.facing,
      time: this.timeAccum,
      vx: p.vx,
      vy: p.vy,
      onGround: p.onGround,
      crouching: p.crouching,
      dancing: p.dancing,
      alive: p.alive,
      wallSliding,
      squashX: p.squashX,
      squashY: p.squashY,
    });

    // Nameplate
    ctx.save();
    ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    const label = isLocal ? `▼ ${p.name}` : p.name;
    const textW = ctx.measureText(label).width + 12;
    ctx.fillStyle = isLocal ? '#FFB703' : 'rgba(255,253,247,0.9)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(cx - textW / 2, bottomY - PLAYER_H - 30, textW, 18, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(label, cx, bottomY - PLAYER_H - 17);
    ctx.restore();
  }

  private drawLava(ctx: CanvasRenderingContext2D, lavaY: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(230, 57, 70, 0.9)';
    ctx.fillRect(0, lavaY, WORLD_W, WORLD_H - lavaY + 60);
    ctx.fillStyle = '#FFB703';
    for (let x = 0; x < WORLD_W; x += 40) {
      const wave = Math.sin(this.timeAccum * 5 + x * 0.05) * 5;
      ctx.beginPath();
      ctx.arc(x + 20, lavaY + wave, 22, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCursors(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
    localPlayerId: string,
    localCursor: CursorState,
    canPlaceLocal: boolean
  ): void {
    for (const p of snapshot.players) {
      const isLocal = p.id === localPlayerId;
      const c = isLocal ? localCursor : p.cursor;
      if (!c.visible || (!isLocal && p.hasPlaced) || !p.heldItemId) continue;

      if (isLocal) {
        this.drawPlacementPreview(ctx, snapshot, p.heldItemId, c, canPlaceLocal);
        if (p.portalFirstPos) {
          ctx.save();
          ctx.strokeStyle = '#7209B7';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.portalFirstPos.gx * TILE + 2, p.portalFirstPos.gy * TILE + 2, TILE - 4, TILE - 4);
          ctx.restore();
        }
      } else {
        const meta = CHARACTERS.find((ch) => ch.id === p.character) ?? CHARACTERS[0];
        ctx.save();
        ctx.fillStyle = meta.badgeColor;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.gx * TILE + TILE / 2, c.gy * TILE + TILE / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawPlacementPreview(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
    itemId: ItemId,
    c: CursorState,
    ok: boolean
  ): void {
    const def = ITEM_MAP[itemId];
    const usedRot = def.rotatable ? c.rot : 0;
    const { w, h } = getRotatedSize(def, usedRot);
    const x = c.gx * TILE;
    const y = c.gy * TILE;
    const pxW = w * TILE;
    const pxH = h * TILE;

    ctx.save();

    // Bomb (3x3) & Mega Bomb (5x5) blast radius + highlight affected blocks
    if (itemId === 'bomb' || itemId === 'mega_bomb') {
      const half = itemId === 'mega_bomb' ? 2 : 1;
      const span = half * 2 + 1;
      const blastRect: Rect = {
        x: (c.gx - half) * TILE,
        y: (c.gy - half) * TILE,
        w: span * TILE,
        h: span * TILE,
      };
      ctx.fillStyle = itemId === 'mega_bomb' ? 'rgba(230, 57, 70, 0.22)' : 'rgba(255, 122, 0, 0.22)';
      ctx.fillRect(blastRect.x, blastRect.y, blastRect.w, blastRect.h);
      ctx.strokeStyle = itemId === 'mega_bomb' ? '#E63946' : '#FF7A00';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 3;
      ctx.strokeRect(blastRect.x, blastRect.y, blastRect.w, blastRect.h);
      ctx.setLineDash([]);

      for (const b of snapshot.blocks) {
        if (rectsOverlap(getBlockRect(b), blastRect)) {
          ctx.fillStyle = 'rgba(230, 57, 70, 0.42)';
          ctx.fillRect(b.x, b.y, b.w * TILE, b.h * TILE);
        }
      }
    }

    // Moving path / range guides for ghost
    if (itemId === 'moving_platform' || itemId === 'moving_saw') {
      const { dx, dy } = dirVector(usedRot);
      ctx.strokeStyle = 'rgba(45, 127, 249, 0.75)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + pxW / 2, y + pxH / 2);
      ctx.lineTo(x + pxW / 2 + dx * 4 * TILE, y + pxH / 2 + dy * 4 * TILE);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (itemId === 'wrecking_ball') {
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.65)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE, 3.2 * TILE, Math.PI / 2 - 1.15, Math.PI / 2 + 1.15);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (itemId === 'black_hole') {
      ctx.strokeStyle = 'rgba(157, 78, 221, 0.65)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, 4.5 * TILE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (itemId === 'fan') {
      const { dx, dy } = dirVector(usedRot);
      ctx.fillStyle = 'rgba(76, 201, 240, 0.24)';
      if (dx > 0) ctx.fillRect(x + TILE, y, 4.5 * TILE, TILE);
      else if (dx < 0) ctx.fillRect(x - 4.5 * TILE, y, 4.5 * TILE, TILE);
      else if (dy > 0) ctx.fillRect(x, y + TILE, TILE, 4.5 * TILE);
      else ctx.fillRect(x, y - 4.5 * TILE, TILE, 4.5 * TILE);
    } else if (itemId === 'flame_thrower') {
      const { dx, dy } = dirVector(usedRot);
      ctx.fillStyle = 'rgba(255, 122, 0, 0.24)';
      if (dx > 0) ctx.fillRect(x + TILE, y + 5, 3 * TILE, TILE - 10);
      else if (dx < 0) ctx.fillRect(x - 3 * TILE, y + 5, 3 * TILE, TILE - 10);
      else if (dy > 0) ctx.fillRect(x + 5, y + TILE, TILE - 10, 3 * TILE);
      else ctx.fillRect(x + 5, y - 3 * TILE, TILE - 10, 3 * TILE);
    } else if (itemId === 'crossbow' || itemId === 'hockey_shooter' || itemId === 'fire_tennis' || itemId === 'paper_plane') {
      const { dx, dy } = dirVector(usedRot);
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.65)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + TILE / 2, y + TILE / 2);
      ctx.lineTo(x + TILE / 2 + dx * 5 * TILE, y + TILE / 2 + dy * 5 * TILE);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Actual item artwork ghost
    ctx.globalAlpha = ok ? 0.88 : 0.45;
    drawItemArtwork(ctx, {
      itemId,
      x,
      y,
      w: pxW,
      h: pxH,
      rot: usedRot,
      flipX: def.flippable ? c.flipX : false,
      time: this.timeAccum,
      previewDemo: true,
    });

    // Validity outline & X badge if invalid
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? '#2BB673' : '#E63946';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 1, y - 1, pxW + 2, pxH + 2);

    if (!ok) {
      ctx.fillStyle = 'rgba(230, 57, 70, 0.28)';
      ctx.fillRect(x, y, pxW, pxH);
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + pxW - 8, y + pxH - 8);
      ctx.moveTo(x + pxW - 8, y + 8);
      ctx.lineTo(x + 8, y + pxH - 8);
      ctx.stroke();
    }

    ctx.restore();
  }
}
